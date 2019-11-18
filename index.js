const fetch = require("node-fetch");
const moment = require("moment");

const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });
const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

require("dotenv").config();

const twitchClientID = process.env.CLIENT_ID;
const team = process.env.TEAM_NAME;

const timestamp = moment()
  .unix()
  .toString();

exports.handler = async function() {
  return new Promise(async (resolve, reject) => {
    try {
      let teamURL = `https://api.twitch.tv/kraken/teams/${team}`;
      let resp = await fetch(teamURL, {
        headers: {
          Accept: "application/vnd.twitchtv.v5+json",
          "Client-ID": twitchClientID
        }
      });
      let data = await resp.json();
      let members = data.users;

      let uids = members.map(member => member._id);
      let idStr = uids.join("&user_id=");

      let activeStreamsURL = `https://api.twitch.tv/helix/streams?user_id=${idStr}`;
      resp = await fetch(activeStreamsURL, {
        headers: {
          "Client-ID": twitchClientID
        }
      });
      data = await resp.json();
      let onlineUsers = data.data.map(user => user.user_name);

      // Terminate early if no one is online
      if (onlineUsers.length === 0) {
        resolve(200);
      }

      const params = {
        RequestItems: {
          LiveCodersStreamPoints: []
        }
      };

      onlineUsers.forEach(user => {
        params.RequestItems.LiveCodersStreamPoints.push({
          PutRequest: {
            Item: {
              username: { S: user },
              timestamp: { N: timestamp }
            }
          }
        });
      });

      ddb.batchWriteItem(params, processCallback);
    } catch (err) {
      console.error(err);
      reject(err);
    }

    function processCallback(err, data) {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        if (data.UnprocessedItems.LiveCodersStreamPoints && data.UnprocessedItems.LiveCodersStreamPoints.length > 0) {
          let params = {}
          params.RequestItems = data.UnprocessedItems
          ddb.batchWriteItem(params, processCallback);
        } else {
          resolve(200)
        }
      }
    }
  });
};
