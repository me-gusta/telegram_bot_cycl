import { Telegraf, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import { Agenda } from '@hokify/agenda';
import { log } from 'console';
import dotenv from 'dotenv'
import * as fs from 'fs';
import { shuffleArray, sleep, get_schedule } from './util.js';
import { MongoClient } from 'mongodb';

const mongo = new MongoClient('mongodb://127.0.0.1')

let db

(async function () {
    await mongo.connect();
    log('started mongodb');
    db = mongo.db('telegram_bot_cycl').collection('schedules')
})();

dotenv.config()


console.log();
const agenda = new Agenda({ db: { address: 'mongodb://127.0.0.1/telegram_bot_cycl' } });

const bot = new Telegraf(process.env.BOT_TOKEN)

const kopt = { columns: 1 }

const MAX_LESSONS = 3

const MODERATOR_ID = Number(process.env.MODERATOR_ID)
const SUBSCRIBE_CHAT_ID = process.env.SUBSCRIBE_CHAT_ID


agenda.define(
    'send_lesson',
    async job => {
        const { lesson_id, chat_id } = job.attrs.data;
        const text = 'Урок #' + lesson_id

        const btns = [
            Markup.button.callback('Купить полную версию', '/form/1'),
        ]
        if (lesson_id < MAX_LESSONS) {
            btns.push(
                Markup.button.callback('Смотреть урок ' + (lesson_id + 1), '/request/' + (lesson_id + 1))
            )
        }

        const markup = Markup.inlineKeyboard(btns, kopt)

        try {
            await bot.telegram.sendVideo(chat_id, lesson_videos[lesson_id])

            await bot.telegram.sendMessage(chat_id, text, markup)
            log('GOOD  send_lesson', chat_id)
        } catch (e) {
            log('-------------------')
            log('ERROR send_lesson', chat_id)
            log(e)

            log('-------------------')
        }
    },
    { priority: 'high', concurrency: 10 }
);

(async function () {
    await agenda.start();
    log('started agenda');
})();


bot.use(async (ctx, next) => {
    // log('user in ', get_user(ctx));
    if (ctx.chat.id !== MODERATOR_ID) {
        await bot.telegram.sendMessage(
            ctx.chat.id, 'Тебя нету в белом списке. У тебя нет права пользоваться этим ботом'
        )
        return
    }
    await next()
    // log('user out', get_user(ctx));
})

const users = new Map()

const get_user = (ctx) => {
    if (ctx.chat.type !== 'private') {
        throw Error('Chat is not private')
    }

    const user_id = ctx.chat.id

    let user = users.get(user_id)
    if (!user) {
        user = {
            location: '/',
            lesson_requested: 0,
            first_name: ctx.chat.first_name || '',
            username: ctx.chat.username || '',
            total_lessons: 0
        }
        users.set(user_id, user)
        return user
    }
    return user
}

const get_msg = () => {
    const list = [
        'покормить кота',
        'навести порядок в доме',
        'создать машину',
        'купить чайник',
        'пойти в подземелье Дракона и завоевать Принцессу',
        'Уничтожить мышь, убидь желудиное логов, сжечь бесов в пламени любви',
        'купить компьютерный прибор',
    ]

    shuffleArray(list)

    return list.map((e, i) => `${i + 1}. ${e}`).join('\n')
}

const update_schedule = async () => {
    const all = await db.find({ is_removed: { $exists: false } }).toArray()
}

const make_today = async () => {
    const all = await db.find({ is_removed: { $exists: false } }).toArray()
    const out = []

    const now = new Date()

    for (let obj of all) {
        const date = new Date(obj.date.getTime())
        date.setHours(0)
        date.setMinutes(0)
        date.setSeconds(1)
        date.setMilliseconds(0)
        const delta = now - date
        const days = Math.floor(delta / (1000 * 60 * 60 * 24))

        switch (obj.type) {
            case 'offset': {
                let is_good = days % obj.value === 0
                if (obj.type === 'once') {
                    is_good = is_good && days / obj.value == 1
                }
                if (is_good) {
                    out.push(obj)
                }
                break
            }
            case 'weekday': {
                const is_good = now.getDay() === obj.value
                if (obj.type === 'once') {
                    is_good = is_good && days <= 7 && days > 0
                }

                if (is_good) {
                    out.push(obj)
                }
                break
            }
            case 'monthday': {
                const is_good = now.getDate() === obj.value
                if (is_good) {
                    out.push(obj)
                }
                break
            }
            case 'specific': {
                const is_good = now.getDate() === obj.value.getDate() && now.getMonth() === obj.value.getMonth()
                if (is_good) {
                    out.push(obj)
                }
                break
            }
        }
    }
    out.sort((a, b) => {
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
    return out
}

const format_obj = (obj, i) => {
    const time = obj.time ? obj.time + ' ' : ''
    const is_checked = obj.is_checked ? '✅ ' : ''
    return (i + 1) + '. ' + is_checked + time + obj.text
}

const send_schedule = async (ctx) => {
    const objs = await make_today()
    const msg = '🥇 *Квесты на сегодня*' + '\n\n' + objs.map(format_obj).join('\n')
    await bot.telegram.sendMessage(ctx.chat.id, {
        text: msg,
        parse_mode: 'markdown'
    })
}

bot.start(async (ctx) => {
    const user = get_user(ctx)
    user.location = '/'

    // await sleep(5000)
    await send_schedule(ctx)
})

bot.on(message('text'), async (ctx) => {
    const user = get_user(ctx)

    const text = ctx.message.text

    const objs = await make_today()

    if (text.startsWith('..') || text.startsWith('.')) {
        // repeat
        // once
        const schedule = {
            ...get_schedule(text),
            date: new Date()
        }
        console.log(schedule);
        await db.insertOne(schedule)
    } else if (text.startsWith('в ') || text.startsWith('v ')) {
        // check as done
        const items = text.replace('в ', '').replace('v ', '').split(' ').map(x => Number(x))
        for (let item of items) {
            let obj = objs[item - 1]
            if (!obj) continue
            await db.updateOne({ _id: obj._id }, { $set: { is_checked: !Boolean(obj.is_checked) } })
        }
        await send_schedule(ctx)
    } else if (text.startsWith('у ') || text.startsWith('y ')) {
        // remove
        // check as done
        const items = text.replace('у ', '').replace('y ', '').split(' ').map(x => Number(x))
        for (let item of items) {
            let obj = objs[item - 1]
            if (!obj) continue
            await db.updateOne({ _id: obj._id }, { $set: { is_removed: true } })
        }
    }

})



bot.catch(error => console.error(error))

console.log('Starting bot');
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

