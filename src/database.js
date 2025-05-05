const Datastore = require('nedb');
const path = require('path');

const dbPath = proccess.env.MODE === 'dev' ? path.join(__dirname, '../data') :  path.join('/function/storage/data')

let db;

(function () {
    // Create data directory if it doesn't exist
    try {
        // Ensure the data directory exists (NeDB will create it if needed)
        const schedulesDb = new Datastore({ 
            filename: path.join(dbPath, 'schedules.db'), 
            autoload: true 
        });
        
        console.log('Started NeDB database');
        
        // Add MongoDB-compatible API methods
        db = {
            find: (query) => {
                return {
                    toArray: () => {
                        return new Promise((resolve, reject) => {
                            schedulesDb.find(query || {}, (err, docs) => {
                                if (err) reject(err);
                                resolve(docs);
                            });
                        });
                    }
                };
            },
            
            findOne: (query) => {
                return new Promise((resolve, reject) => {
                    schedulesDb.findOne(query || {}, (err, doc) => {
                        if (err) reject(err);
                        resolve(doc);
                    });
                });
            },
            
            insertOne: (doc) => {
                return new Promise((resolve, reject) => {
                    if (!doc) {
                        return resolve({ insertedId: null });
                    }
                    schedulesDb.insert(doc, (err, newDoc) => {
                        if (err) return reject(err);
                        if (!newDoc) return resolve({ insertedId: null });
                        resolve({ insertedId: newDoc._id });
                    });
                });
            },
            
            deleteOne: (query) => {
                return new Promise((resolve, reject) => {
                    schedulesDb.remove(query, { multi: false }, (err, numRemoved) => {
                        if (err) reject(err);
                        resolve({ deletedCount: numRemoved });
                    });
                });
            },
            
            updateOne: (query, update) => {
                return new Promise((resolve, reject) => {
                    schedulesDb.update(query, update, {}, (err, numReplaced) => {
                        if (err) reject(err);
                        resolve({ modifiedCount: numReplaced });
                    });
                });
            }
        };
    } catch (err) {
        console.error('Error initializing database:', err);
    }
})();

module.exports = { db };