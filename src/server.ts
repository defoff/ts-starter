import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import {MongoError} from 'mongodb';
import * as bodyParser from 'body-parser';
import {DoModel} from './models/Do';
import {UserDocument, UserModel} from './models/User';
import { authenticate } from './middleware/authenticate';
import { isBuffer } from 'util';
import validator from 'validator';

class Server {
    public server: express.Application;
    constructor() {
        this.server = express();
        this.init();
        this.routes();
    }
    public init(): void {
        // Bodyparser Middleware
        this.server.use(bodyParser.json());
        this.server.use(
            bodyParser.urlencoded({
                extended: false,
                limit: '5mb',
                parameterLimit: 5000
            })
        );
        // connect to MongoDB
        mongoose.Promise = global.Promise;
        mongoose.connect('mongodb://127.0.0.1:27017/Trafo').then((client) => {
            console.log('Server connected to database');
        }).catch((err: MongoError) => {
            console.log(`Server couldnt connect to database.\nError: ${err}`);
        });
    }
    public routes(): void {
        /**
         * GET /dos: get all "dos"
         */
        this.server.get('/dos', authenticate, (req, res) => {
            DoModel.find({}, (err, result) => {
                if (err) {
                    return res.status(500).send(`An error occured while fetching documents ${err}`);
                }
                res.type('application/json').status(200).send(JSON.stringify(result, undefined, 2));
            });
        });

        /**
         * POST /do: create a new "do"
         */
        this.server.post('/do', (req, res) => {
            let item = new DoModel({ title: req.body.title, description: req.body.description});
            item.save((err, result) => {
                if (err) {
                    if (!req.body.title || !req.body.description) {
                        return res.status(400).send('Bad Request: The request body is invalid');
                    }
                    return res.status(500).send(`An error occured while saving document to database ${err}`);
                }
                res.status(201).send(result._id);
            });
        });

        /**
         * PATCH /do: update an existing "do"
         */
        this.server.patch('/do', (req, res) => {
            DoModel.update({_id: req.body._id}, { $set: { title: 'new title'}}, (err, result) => {
                if(err) { return res.status(500).send(); }
                res.status(201).send(result);
            });
        });

        /**
         * DELETE /do: delete a "do"
         */
        this.server.delete('/do', (req, res) => {
            DoModel.deleteOne({_id: req.body._id}, (err) => {
                if (err) {
                    return res.status(500).send(`cannot delete document:\nError ${err}`);
                }
                if (!req.body._id) {
                    return res.status(400).send('you need to provide a valid id');
                }
                res.status(201).send('document deleted');
            });
        });

        /**
         * DELETE /dos: delete all "dos"
        */
        this.server.delete('/dos', (req, res) => {
            DoModel.deleteMany({}, (err) => {
                if (err) {
                    return res.status(500).send(`cannot delete all documents:\nError ${err}`);
                }
                res.status(201).send('all documents have been deleted');
            });
        });

        /**
         * GET /users/me
         */
        this.server.get('/users/me', authenticate, (req: express.Request, res: express.Response) => {
            res.send(req.body.user);
        });

        /**
         * POST /users
         */
        this.server.post('/users', (req: express.Request, res: express.Response) => {
            let user = new UserModel({email: req.body.email, password: req.body.password});
            user.save().then((user: UserDocument) => {
                return user.generateAuthToken();
            }).then((token: string) => {
                // prefix the header with x-auth for a custom header with our jwt and send the user document
                res.header('x-auth', token).send(user);
            }).catch((e: Error) => {
                res.status(400).send(e);
            });
        });
        

        /**
         * Login
         */
        this.server.post('/users/login', (req: express.Request, res: express.Response) => {
            let email = req.body.email;
            let password = req.body.password;
            UserModel.findByCredentials(email, password).then((user: any) => {
                return user.generateAuthToken().then((token: string) => {
                    res.header('x-auth', token).send(user);           
                });
            }).catch((err) => {
                res.status(400).send();
            });
        });

        /**
         * Logout
         */
        this.server.delete('/users/me/token', authenticate, (req: express.Request, res: express.Response) => {
            req.body.user.removeToken(req.body.token).then(() => {
                res.status(200).send();
            }, () => {
                res.status(400).send();
            });
        });
    }
}
export default new Server().server;