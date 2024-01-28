import moment from "moment"

export const sleep = ms => new Promise(r => setTimeout(r, ms))
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
}


const is_time = (time_str) => {
    const is_good = time_str.match(/\d\d:\d\d/) || time_str.match(/\d:\d\d/)

    if (! is_good)
        return false
    let [hours, minutes] = time_str.split(':')
    hours = Number(hours)
    minutes = Number(minutes)
    if (hours < 0 || hours > 23)
        return false
    if (minutes < 0 || minutes > 60)
        return false
    return true
}


export const get_now_timestamp = () => {
    const date = moment()
    date.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    return date.unix()
}

export const time_in_day = (60 * 60 * 24)
export const weekdays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
export const months = { 'янв': 31, 'фев': 29, 'март': 31, 'апр': 30, 'май': 31, 'июн': 30, 'июл': 31, 'авг': 31, 'сен': 30, 'окт': 31, 'ноя': 30, 'дек': 31 }

const get_finite = (cycl) => {

    const has_monthday = (x) => {
        for (let month of Object.keys(months)) {
            if (x.includes(month)) return true
        }
    }

    const now = get_now_timestamp()

    if (weekdays.indexOf(cycl) !== -1) {
        // в следующий день недели "cycl"

        const weekday = weekdays.indexOf(cycl) + 1

        for (let i = 1; i < 8; i++) {
            const target_time = now + i * time_in_day
            const date = moment.unix(target_time)
            if (date.day() === weekday) {
                return {
                    type: 'finite',
                    timestamp: date.unix()
                }
            }
        }

    } else if (!isNaN(cycl)) {
        // через cycl дней
        const n_days = Number(cycl)

        const target_time = now + n_days * time_in_day
        const date = moment.unix(target_time)
        return {
            type: 'finite',
            timestamp: date.unix()
        }
    } else if (has_monthday(cycl)) {
        // такого-то числа такого-то месяца
        const month = cycl.replace(/\d/g, "")
        const day = Number(cycl.replace(/\D/g, ""))
        if (months[month] < day || day <= 0)
            return

        const month_n = Object.keys(months).indexOf(month)

        for (let i = 1; i < 365; i++) {

            const target_time = now + i * time_in_day
            const date = moment.unix(target_time)
            if (date.month() === month_n && date.date() === day) {
                return {
                    type: 'finite',
                    timestamp: date.unix()
                }
            }
        }
    }

    return undefined
}

const get_repeat = (cycl) => {
    if (weekdays.indexOf(cycl) !== -1) {
        // в каждый день недели "cycl"
        return {
            date_init: get_now_timestamp(),
            weekday: weekdays.indexOf(cycl),
            type: 'weekday'
        }

    } else if (!isNaN(cycl)) {
        // каждые cycl дней
        return {
            date_init: get_now_timestamp(),
            modulo: Number(cycl),
            type: 'modulo'
        }
    } else if (cycl.includes('ч')) {
        // 26 числа каждого месяца
        const day = Number(cycl.replace(/\D/g, ""))
        return {
            date_init: get_now_timestamp(),
            monthday: Number(day),
            type: 'monthday'
        }
    }

    return undefined
}

const get_text = (split) => {
    let time = split[1]
    if (!is_time(time))
        time = ''

    let data = {}

    let text
    if (time !== '') {
        text = split.slice(2).join(' ')
        data['time'] = time
    } else {
        text = split.slice(1).join(' ')
    }

    data['text'] = text

    return data
}

export const get_schedule = (init_str) => {
    const split = init_str.split(' ')
    const dots = split[0].split('').filter(x => x == '.')
    const cycl = split[0].replaceAll('.', '')

    if (!cycl) return undefined


    let type
    if (dots.length == 1) {
        type = get_finite(cycl)
    } else {
        type = get_repeat(cycl)
    }

    if (!type) return undefined

    return {
        ...type,
        ...get_text(split)
    }
}