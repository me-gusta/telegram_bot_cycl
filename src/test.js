import { shuffleArray, sleep, get_schedule } from './util.js';

const lines_text = `
..вт 19:30 занятие биологией
.1 спросить у дмитрия юрича скотч
.3 купить шурупы
.2 узнать пришла ли посылка
..2 9:30 проверить ферму
..4 20:30 проставить лайки
.7 анлок андроида
..26ч оплата интернет самаралан
..д26-1 поехать в гаи
 оплата интернет самаралан
....4 оплата интернет самаралан
.p оплата интернет самаралан
`


const main = () => {
    const lines = lines_text.split('\n').filter(x => x.length)
    console.log(lines)
    const table = lines.map(x => get_schedule(x))
    console.table(table)
}

main()