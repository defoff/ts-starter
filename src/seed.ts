
import {ObjectId, ObjectID} from 'mongodb';
import {UserDocument, UserModel} from './models/User';
import jwt from 'jsonwebtoken';

let userOneId = new ObjectID();
let userTwoId = new ObjectID();

export const users = [{
    _id: userOneId,
    email: 'rolf.cook@googlemail.com',
    password: 'userOnePassword',
    tokens: [{
        access: 'auth',
        token: jwt.sign({_id: userOneId, access: 'auth'}, 'abc123').toString()
    }]
}, {
    _id: userTwoId,
    email: 'rolf.cook@gmail.com',
    password: 'userTwoPassword'
}];

export const populateUsers = (done: any) => {
    UserModel.deleteMany({}).then(() => {
        let userOne = new UserModel(users[0]);
        userOne.save();
        let userTwo = new UserModel(users[1]);
        userTwo.save();
        return Promise.all([userOne, userTwo]);
    }).then(() => done());
};