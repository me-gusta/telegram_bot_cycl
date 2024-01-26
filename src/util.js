export const sleep = ms => new Promise(r => setTimeout(r, ms))
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
}


const is_time = (time_str) => {
    if (!time_str.match(/\d\d:\d\d/) || !time_str.match(/\d:\d\d/))
        return false
    const [hours, minutes] = time_str.split(':')
    if (hours < 0 || hours > 23)
        return false
    if (minutes < 0 || minutes > 60)
        return false
    return true
}

export const get_schedule = (init_str) => {
    const weekdays = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
    const split = init_str.split(' ')
    const dots = split[0].split('').filter(x => x == '.')
    const cycl = split[0].replaceAll('.', '')
    let time = split[1]
    if (!is_time(time))
        time = ''

    let type_date
    let value
    let type_periodic = dots.length == 1 ? 'once' : 'repeat'
    
    if (weekdays.indexOf(cycl) !== -1) {
        type_date = 'weekday'
        value = weekdays.indexOf(cycl) + 1
    } else if (!isNaN(cycl)) {
        type_date = 'offset'
        value = Number(cycl)
    } else if (cycl.includes('ч')) {
        type_periodic = 'repeat'
        type_date = 'monthday'
        value = Number(cycl.replace('ч', ''))
    } else if (cycl.includes('д')) {
        type_periodic = 'once'
        type_date = 'specific'
        const [day, month] = cycl.replace('д', '').split('-')
        value = new Date()
        console.log(day, month)
        value.setDate(Number(day))
        value.setMonth(Number(month) - 1)
        console.log(value.getTime())
        if (isNaN(value.getTime()))
            value = undefined
        
    }

    const data = {
        type: type_date,
        value,
        type_periodic,
    }

    let text
    if (time !== '') {
        text = split.slice(2).join(' ')
        data['time'] = time
    } else {
        text = split.slice(1).join(' ')
    }
    
    data['text'] = text

    let is_good = true
    Object.values(data).forEach(value=>{
        if (value === undefined)
            is_good = false 
    })

    if (is_good)
        return data
    else
        return undefined
}