import Datastore from 'nedb';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data');

export let db;

(async function () {
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
                    schedulesDb.insert(doc, (err, newDoc) => {
                        if (err) reject(err);
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