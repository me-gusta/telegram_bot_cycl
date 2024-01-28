import moment from "moment"
import { db } from "./database.js"
import { get_now_timestamp, get_schedule, sleep, time_in_day, months, weekdays } from "./util.js"

const emoji_number= (number) => {
    if (number > 9 || number < 1) return number

    const emojies = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
    return emojies[number]
}

const format_task = (obj, i) => {
    const time = obj.time ? obj.time + ' ' : ''
    const is_checked = obj.is_checked ? '✅' : emoji_number(i + 1)
    return  is_checked + ' ' + time + obj.text
}

const sort_tasks = (tasks) => {
    tasks.sort((a, b) => {
        const get_time = (time_str) => {
            const split = time_str.split(':')
            const h = Number(split[0])
            const m = Number(split[1])
            return h * 60 + m
        }
        const a_time = a.time === undefined ? 0 : get_time(a.time)
        const b_time = b.time === undefined ? 0 : get_time(b.time)
        return a_time - b_time
    })
}


export const string_for_day = (timestamp, tasks) => {
    const date = moment.unix(Number(timestamp))
    const weekday = weekdays[date.day()]
    const monthday = date.date()
    const month = Object.keys(months)[date.month()]

    let text = `*${monthday} ${month} (${weekday})*\n`

    sort_tasks(tasks)

    text += tasks.map(format_task).join('\n')

    return text
}

const is_task_for_day = (task, target_timestamp) => {
    if (task.type === 'finite') {
        if (task.timestamp === target_timestamp) return true
    } else {
        let is_good
        const date = moment.unix(target_timestamp)
        switch (task.type) {
            case 'modulo': {
                is_good = ((target_timestamp - task.date_init) / time_in_day) % task.modulo === 0
                break
            }

            case 'monthday': {
                is_good = date.date() === task.monthday
                break
            }

            case 'weekday': {
                is_good = date.day() === task.weekday
                break
            }
            case _: {
                is_good = false
                break
            }
        }
        return is_good
    }
}

const make_interval = async () => {
    const now = get_now_timestamp()
    const tasks = await db.find({ is_removed: { $exists: false } }).toArray()

    const out = {}

    const distance = 9
    const distance_full = 31

    for (let i = 0; i < distance_full; i++) {
        const target_timestamp = now + i * time_in_day
        out[target_timestamp] = []

        for (let task of tasks) {
            const is_good = is_task_for_day(task, target_timestamp)
            if (!is_good) continue

            if (task.type === 'finite') {
                out[target_timestamp].push(task)
            } else {
                if (i < distance) {
                    out[target_timestamp].push(task)
                    task.added = true
                } else {
                    if (task.added) continue

                    out[target_timestamp].push(task)
                    task.added = true
                }
            }


        }
        if (out[target_timestamp].length === 0)
            delete out[target_timestamp]
    }
    return out
}

export const pretty_print_interval = async () => {
    const interval = await make_interval()
    let texts = []

    for (let [timestamp, tasks] of Object.entries(interval)) {
        texts.push(string_for_day(timestamp, tasks))
    }
    texts.reverse()
    return texts.join('\n\n')
}


export const make_day = async (timestamp) => {
    const tasks = await db.find({ is_removed: { $exists: false } }).toArray()
    const out = []
    for (let task of tasks) {
        const is_good = is_task_for_day(task, timestamp)
        if (!is_good) continue

        out.push(task)
    }
    sort_tasks(out)
    return out
}

export const pretty_print_day = async (timestamp) => {
    const tasks = await make_day(timestamp)

    return string_for_day(timestamp, tasks)
}