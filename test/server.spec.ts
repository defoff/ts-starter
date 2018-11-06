import expect from "expect";
import request from "supertest";

import server from '../src/server';
import {UserDocument, UserModel} from '../src/models/User';
import {users, populateUsers} from '../src/seed';

beforeEach(populateUsers);

describe('GET /users/me', () => {
    // valid authentication token
    it('should return user if authenticated', (done) => {
        request(server)
        .get('/users/me')
        .set('x-auth', users[0].tokens[0].token)
        .expect(200)
        .expect((res) => {
            expect(res.body._id).toBe(users[0]._id.toHexString());
            expect(res.body.email).toBe(users[0].email);
        })
        .end(done);
    });
    // invalid authentication token
    it('should return 401 if not authenticated', (done) => {
        request(server)
        .get('/users/me')
        .expect(401)
        .expect((res) => {
            expect(res.body).toEqual({});
        })
        .end(done);
    });
});

describe('POST /users', () => {
    it('should create a user', (done) => {
        let email = 'example@example.com';
        let password = '123456';

        request(server)
        .post('/users')
        .send({email, password})
        .expect(200)
        .expect((res) => {
            expect(res.header['x-auth']).toExist;
            expect(res.body._id).toExist;
            expect(res.body.email).toBe(email);
        })
        .end((err) => {
            if (err) {
                return done(err);
            }
            UserModel.findOne({email}).then((user) => {
                expect(user).toExist;
                expect(user.password).not.toBe(password);
                done();
            }).catch((error) => done(error));
        });
    });
    it('should return validation errors if request invalid', (done) => {
        let email = 'example.com';
        let password ='123';
        request(server)
        .post('/users')
        .send({email, password})
        .expect(400)
        .end(done);
    });
    it('should not create if email in use', (done) => {
        request(server)
        .post('/users')
        .send({
            email: users[0].email,
            password: 'Password123!'
        })
        .expect(400)
        .end(done);
    });
});

describe('POST /users/login', () => {
    it('should login user and return auth token', (done) => {
        request(server)
        .post('/users/login')
        .send({
            email: users[1].email,
            password: users[1].password
        })
        .expect(200)
        .expect((res) => {
            expect(res.header['x-auth']).toExist;
        })
        .end((err, res) => {
            if (err) {
                return done(err);
            }
            UserModel.findById(users[1]._id).then((user) => {
                expect(user.tokens[0]).toMatchObject({
                    access: 'auth',
                    token: res.header['x-auth']
                });
                done();
            }).catch((err) => done(err));
          
        });
    });

    it('should reject invalid login', (done) => {
        request(server)
        .post('/users/login')
        .send({
            email: users[1].email,
            password: users[1].password + 'xyz'
        })
        .expect(400)
        .expect((res) => {
            expect(res.header['x-auth']).not.toExist;
        })
        .end((err, res) => {
            if (err) {
                return done(err);
            }
            UserModel.findById(users[1]._id).then((user) => {
                expect(user.tokens.length).toBeLessThan(1);
                done();
            }).catch((err) => done(err));
        });
    });
});


describe('DELETE /users/me/token', () => {
    it('should remove auth token on logout', (done) => {
        request(server)
        .delete('/users/me/token')
        .set('x-auth', users[0].tokens[0].token)
        .expect(200)
        .end((err, res) => {
            if (err) {
                return done(err);
            }
            UserModel.findById(users[0]._id).then((user) => {
                expect(user.tokens.length).toBeLessThan(1);
                done();
            }).catch((err) => done(err));
        });
    });
});