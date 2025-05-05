import {Telegraf, Markup} from 'telegraf'
import {message} from 'telegraf/filters'
import dotenv from 'dotenv'
import {sleep, get_schedule, get_now_timestamp, time_in_day} from './util.js';
import {db} from './database.js';
import {make_day, pretty_print_interval, pretty_print_day} from './tasks.js';


dotenv.config()

const bot = new Telegraf(process.env.BOT_TOKEN)

const MODERATOR_ID = Number(process.env.MODERATOR_ID)

let last_inserted_id = undefined

// // Simple scheduler to send daily notifications at 9:00 AM
// const scheduleNotification = () => {
//     const scheduleDaily = () => {
//         const now = new Date();
//         let nextNotification = new Date();
        
//         // Set to 9:00 AM
//         nextNotification.setHours(9, 0, 0, 0);
        
//         // If it's already past 9 AM, schedule for tomorrow
//         if (now > nextNotification) {
//             nextNotification.setDate(nextNotification.getDate() + 1);
//         }
        
//         // Time until next notification in ms
//         const timeUntilNotification = nextNotification - now;
        
//         console.log(`Next notification scheduled for ${nextNotification}`);
        
//         // Schedule the notification
//         setTimeout(async () => {
//             // Send the notification
//             try {
//                 const tasks = await make_day(get_now_timestamp());
//                 console.log('tasks:', tasks);
//                 if (tasks.length > 0) {
//                     await send_today();
//                 }
//             } catch (error) {
//                 console.error('Error sending notification:', error);
//             }
            
//             // Schedule the next day's notification
//             scheduleDaily();
//         }, timeUntilNotification);
//     };
    
//     // Start the scheduling
//     scheduleDaily();
// };

// // Start the notification scheduler
// scheduleNotification();


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


const send_today = async (ctx) => {
    const msg = '🥇 *Квесты на сегодня*' + '\n\n' + await pretty_print_day(get_now_timestamp())
    await bot.telegram.sendMessage(MODERATOR_ID, {
        text: msg,
        parse_mode: 'markdown'
    })
}

bot.start(async (ctx) => {
    const user = get_user(ctx)
    user.location = '/'

    // await sleep(5000)
    await send_today(ctx)
})

bot.command('notify', async (ctx) => {
    await sleep(5000)
    await send_today(ctx)
})

bot.command('cancel', async (ctx) => {
    if (!last_inserted_id)
        return
    await db.deleteOne({_id: last_inserted_id})
    await bot.telegram.sendMessage(MODERATOR_ID, {
        text: 'Действие отменено',
        parse_mode: 'markdown'
    })

    await send_today(ctx)
})

bot.command('all', async (ctx) => {
    // сначала подробно неделя - таски что повторяются и точные (9 дней)
    // потом таски что в неделю не вмещаются, но будут потом
    const text = await pretty_print_interval() || 'Нет задач'
    await bot.telegram.sendMessage(ctx.chat.id, {
        text,
        parse_mode: 'markdown'
    })
})


bot.command('help', async (ctx) => {
    const text = `**Помощь**
    /all - всё расписание
    /start - расписание на сегодня
    /past [n:int:optional] - расписание n дней назад
    /cancel - удалить последнее добавленное задание
    /notify - через 5 секунд прислать уведомление с расписание на сегодня
    
    **Синтаксис**
    Новое задание
    .6 - задание через N дней
    .пн - задание в N день недели
    .5авг - задание в N день
    
    Новое повторяющееся задание
    ..6 - каждые N дней
    ..пн - каждый N день недели
    ..15ч - N числа каждого месяца
    `
    await bot.telegram.sendMessage(ctx.chat.id, {
        text,
        parse_mode: 'markdown'
    })
})


bot.command('past', async (ctx) => {
    const args = ctx.message.text.split(' ')
    let day_n = 1
    if (args.length > 1) {
        day_n = Number(args[1])
    }

    if (isNaN(day_n) || day_n < 1) return

    const poza = 'поза'.repeat(day_n - 1)

    const msg = `*Что было ${poza}вчера*` + '\n\n' + await pretty_print_day(get_now_timestamp() - (time_in_day * day_n))
    await bot.telegram.sendMessage(ctx.chat.id, {
        text: msg,
        parse_mode: 'markdown'
    })
})

bot.on(message('text'), async (ctx) => {
    const user = get_user(ctx)

    const text = ctx.message.text.toLowerCase()

    const tasks = await make_day(get_now_timestamp())

    if (text.startsWith('..') || text.startsWith('.')) {
        // repeat
        // once
        const schedule = get_schedule(text)
        const response = await db.insertOne(schedule)
        last_inserted_id = response.insertedId
    } else if (text.startsWith('в ') || text.startsWith('v ')) {
        // check as done
        const checkmarks = text.replace('в ', '').replace('v ', '').split(' ').map(x => Number(x))

        for (let mark of checkmarks) {
            let task = tasks[mark - 1]
            if (!task) continue
            const data = {
                mark: true,
                date: get_now_timestamp(),
                for_task: task._id
            }
            const checkmark = await db.findOne(data)
            if (checkmark) {
                await db.deleteOne(checkmark)
            } else {
                await db.insertOne(data)
            }
        }
    } else if (text.startsWith('у ') || text.startsWith('y ')) {
        // remove
        // check as done
        const items = text.replace('у ', '').replace('y ', '').split(' ').map(x => Number(x))
        for (let item of items) {
            let obj = tasks[item - 1]
            if (!obj) continue
            await db.updateOne({_id: obj._id}, {$set: {is_removed: true}})
        }
    }
    await send_today(ctx)

})


bot.catch(error => console.error(error))

console.log('Starting bot');
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

