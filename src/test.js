
import moment from "moment"
import { db } from "./database.js"
import { get_now_timestamp, get_schedule, sleep, time_in_day, months, weekdays } from "./util.js"
import { pretty_print_interval, pretty_print_today } from "./tasks.js"


const lines_text = `
..вт 19:30 занятие биологией
.вт собрать урожай
.1 спросить у дмитрия юрича скотч
.3 купить шурупы
.2 узнать пришла ли посылка
..2 9:30 проверить ферму
..4 20:30 проставить лайки
.7 анлок андроида
..26ч оплата интернет самаралан
..д26-1 поехать в гаи
.д26-1 поехать в гаи
.26янв поехать в гаи
 оплата интернет самаралан
....4 оплата интернет самаралан
.p оплата интернет самаралан
`


const test_table = () => {
    const lines = lines_text.split('\n').filter(x => x.length)
    console.log(lines)
    const table = lines.map(x => get_schedule(x))
    console.table(table)
}


const test_add_test_values = async () => {
    await sleep(200)
    console.log('setting test values');
    const lines = lines_text.split('\n').filter(x => x.length)
    console.log(lines)
    const table = lines.map(async (x) => {
        const schedule = get_schedule(x)
        if (!schedule) return
        await db.insertOne(schedule)

    })
}

const test = async () => {
    await sleep(200)
    console.log(await pretty_print_today());
}

test()