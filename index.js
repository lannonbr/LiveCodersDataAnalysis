const fetch = require("node-fetch")
const moment = require("moment")

const AWS = require("aws-sdk")
AWS.config.update({ region: "us-east-1" })
const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" })

require("dotenv").config()

const twitchClientID = process.env.CLIENT_ID
const team = process.env.TEAM_NAME

exports.handler = async function() {
  return new Promise(async (resolve, reject) => {
    let rootResolve = resolve
    let rootReject = reject

    const timestamp = moment()
      .unix()
      .toString()

    try {
      let teamURL = `https://api.twitch.tv/kraken/teams/${team}`
      let resp = await fetch(teamURL, {
        headers: {
          Accept: "application/vnd.twitchtv.v5+json",
          "Client-ID": twitchClientID,
        },
      })
      let data = await resp.json()
      let members = data.users

      let uids = members.map(member => member._id)

      let onlineUsersEntries = []

      for (let i = 0; i < Math.ceil(uids.length / 50); i++) {
        let idStr = uids.slice(i * 50, i * 50 + 50).join("&user_id=")

        let activeStreamsURL = `https://api.twitch.tv/helix/streams?user_id=${idStr}`
        resp = await fetch(activeStreamsURL, {
          headers: {
            "Client-ID": twitchClientID,
          },
        })
        data = await resp.json()

        let liveEntries = data.data.map(user => ({
          user: user.user_name,
          game_id: user.game_id,
        }))

        onlineUsersEntries.push(...liveEntries)
      }

      console.log({ onlineUsersEntries })

      // Terminate early if no one is online
      if (onlineUsersEntries.length === 0) {
        rootResolve(200)
      }

      const params = {
        RequestItems: {
          LiveCodersStreamPoints: onlineUsersEntries.map(user => ({
            PutRequest: {
              Item: {
                username: { S: user.user },
                timestamp: { N: timestamp },
                game_id: { S: user.game_id },
              },
            },
          })),
        },
      }

      let response = await ddb.batchWriteItem(params).promise()

      while (
        response.UnprocessedItems.LiveCodersStreamPoints &&
        response.UnprocessedItems.LiveCodersStreamPoints.length > 0
      ) {
        params.RequestItems = response.UnprocessedItems
        response = await ddb.batchWriteItem(params).promise()
      }

      rootResolve(200)
    } catch (err) {
      console.error(err)
      rootReject(err)
    }
  })
}

exports.handler()
