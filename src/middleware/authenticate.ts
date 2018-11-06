import express from 'express';
import {UserDocument, UserModel} from '../models/User';

/**
 * authentication middleware
 */
export let authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // fetch the token from the request
    let token = req.header('x-auth');
    // find the user associated with the token
    UserModel.findByToken(token).then((user: UserDocument) => {
        if (!user) {
            return Promise.reject();
        }
        req.body.user = user;
        req.body.token = token;
        next();
    }).catch((e) => {
        res.status(401).send('unauthorized');
    });
};
