import {Document, model, Model, Schema, Promise} from 'mongoose';
import validator from 'validator';
import _ from 'lodash';
import jwt from 'jsonwebtoken';
import bcrypt, { hash } from 'bcryptjs';

// define our interfaces
export interface User {
    email: string,
    password: string,
    tokens: [{access: string, token: string}]
}

export interface UserDocument extends User, Document {
    // declare any instance methods here
    generateAuthToken(): Promise<string>;
    findByToken(token: string): Promise<void>;
    findByCredentials(email: string, passoword: string): Promise<void>;
}

export interface UserModelInterface extends Model<UserDocument> {
    // declare any static methods here
    findByToken(token: string): Promise<UserDocument>; 
    findByToken(token: string): Promise<void>;
    findByCredentials(email: string, passoword: string): Promise<void>;
}

/**
 * Everything in Mongoose starts with a Schema.
 * Each schema maps to a MongoDB collection and defines the shape 
 * of the documents within that collection.
 */
let UserSchema = new Schema(
    { 
        email: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            unique: true, // only one email can be created in our DB
            // we want an email validator
            validate: {
                // we use the npm validator package
                validator: validator.isEmail,
                message: '{VALUE} is not a valid email'
            }
        },
        password: {
            type: String,
            required: true,
            minlength: 6
        },
        tokens: [{
            access: {
                type: String,
                required: true
            },
            token: {
                type: String,
                required: true
            }
        }]
    }
);

/**
 *  overwrite the toJSON method by declaring an instance method
 */
UserSchema.methods.toJSON = function () {
    let user = this;
    // toObject takes to mongoose value and converts it to a regular object
    let userObject = user.toObject();
    // we only want to return _id and email since there is no need for other data
    return _.pick(userObject, ['_id', 'email']);
};

// userSchema.methods is an object
// so called instance methods that have access to the insights of the schema (members)
UserSchema.methods.generateAuthToken = function () {
    let user = this;
    // we need an acces and token 
    var access = 'auth';
    // document to sign + our secret for salting
    var token = jwt.sign({_id: user._id.toHexString(), access}, 'abc123').toString();
    // update the user tokens array
    // user.tokens.push({access, token});
    // this is the recommended method (more support on several mongodb distributions for node)
    user.tokens = user.tokens.concat([{access, token}]);
    return user.save().then(() => {
        return token;
    });
};

// instance methods
UserSchema.methods.removeToken = function (token: string) {
    let user = this;
    return user.updateOne({
        $pull: {
            tokens: {
                token: token
            }
        }
    });
};

// declare an model method (static)
UserSchema.statics.findByToken = function (token: string): Promise<UserDocument> {
    // since this is a model method
    let User = this;
    // initialize a variable
    let decoded: any;
    try {
        decoded = jwt.verify(token, 'abc123');
    } catch (e) {
        return Promise.reject();
    }
    // success, if we could verify the token
    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
};

UserSchema.statics.findByCredentials = function (email: string, password: string) {
    let User = this;
    return User.findOne({email}).then((user:UserDocument) => {
        if(!user) {
            return Promise.reject();
        }
        return new Promise((resolve: any, reject: any) => {
            // use bcrypt.compare to compare password and user.password
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user);
                } else {
                    // sends a 400 status back
                    reject();
                }
            });
        });
    });
}

// hashing our passwords before saving users
UserSchema.pre('save', function (next) {
    let user: any = this;

    if (user.isModified('password')) {
        // user.password
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            })
        });
    } else {
        next();
    }
});

/**
 * To use our schema definition, we need to convert our userSchema
 * into a Model we can work with. To do so, we pass it into 
 * mongoose.model(modelName, schema)
 */
export const UserModel: UserModelInterface = model<UserDocument, UserModelInterface>('User', UserSchema);
