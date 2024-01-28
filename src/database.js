import { MongoClient } from 'mongodb';

const mongo = new MongoClient('mongodb://127.0.0.1')

export let db

(async function () {
    await mongo.connect();
    console.log('started mongodb')
    db = mongo.db('telegram_bot_cycl').collection('schedules')
})();