import React, { useState, useEffect } from "react"
import moment from "moment"
import { Calendar, momentLocalizer } from "react-big-calendar"
import "react-big-calendar/lib/css/react-big-calendar.css"

import streams from "./data.json"

const loc = momentLocalizer(moment)

const MyCalendar = () => {
  const [events, setEvents] = useState([])

  useEffect(() => {
    let evts = []

    let streamers = Object.keys(streams)

    for (let streamer of streamers) {
      streams[streamer].forEach(stream => {
        stream.startTime = moment(stream.startTime, "llll").toDate()
        stream.endTime = moment(stream.endTime, "llll").toDate()

        evts.push({ ...stream })
      })
    }

    setEvents(evts)
  }, [])

  return (
    <Calendar
      localizer={loc}
      events={events}
      startAccessor="startTime"
      endAccessor="endTime"
      defaultView="week"
      titleAccessor="streamer"
      style={{ height: 2500 }}
    />
  )
}

function App() {
  return <MyCalendar />
}

export default App
