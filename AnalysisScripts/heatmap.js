const data = require(process.argv[2])

const {
  parse,
  startOfWeek,
  differenceInSeconds,
  addHours,
  addWeeks,
  subMinutes,
  startOfHour,
  getUnixTime,
  getHours,
  getDay,
  isEqual,
} = require("date-fns")

const streams = Object.entries(data).reduce((acc, curr) => {
  acc.push(...curr[1])
  return acc
}, [])

let timeGrid = []

for (let i = 0; i < 7; i++) {
  timeGrid[i] = []
  timeGrid[i].length = 24
  timeGrid[i] = timeGrid[i].fill(0, 0, 24)
}

// Ex: Tue, Dec 24, 2019 12:00 PM -0500
let timeFmt = "EEE, LLL d, yyyy h:mm bbb xx"

// Start the current time at the start of the week
let currTimePointer = startOfWeek(new Date())

let endOfWeek = subMinutes(startOfWeek(addWeeks(new Date(), 1)), 5)

while (differenceInSeconds(endOfWeek, currTimePointer) > 0) {
  const currUnix = getUnixTime(currTimePointer)
  const currHour = getHours(currTimePointer)
  const currDay = getDay(currTimePointer)

  const streamsInHour = streams.filter(stream => {
    const start = parse(stream.startTime, timeFmt, new Date())
    const end = parse(stream.endTime, timeFmt, new Date())

    const endBarrier = isEqual(startOfHour(end), end)
      ? end
      : startOfHour(addHours(end, 1))

    const startUnix = getUnixTime(startOfHour(start))
    const endUnix = getUnixTime(endBarrier)

    return startUnix <= currUnix && currUnix < endUnix
  })

  if (streamsInHour) {
    timeGrid[currDay][currHour] += streamsInHour.length
  }

  // add an hour
  currTimePointer = addHours(currTimePointer, 1)
}

let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Generate CSV output

console.log("day,hour,value")

timeGrid.forEach((day, i) => {
  day.forEach((hour, j) => {
    console.log(`${days[i]},${j},${hour}`)
  })
})
