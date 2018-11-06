import mongoose from 'mongoose';

// define a schema
const doSchema = new mongoose.Schema(
    { 
        title: {type: String, required: true, minlength: 5, trim: true}, 
        description: {type: String, required: true, minlength: 10, trim: true},
        createdAt: {type: Date, required: false, default: new Date()}
    }
);

// export the model
export const DoModel = mongoose.model('Do', doSchema);