
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const dataTables = require('mongoose-datatables');

const UsersSchema = new Schema({
    _id: { type: Schema.ObjectId, auto: true },
    email: { type: String, default: null },
    role: { type: String, default: "USER" },
    notification: {
        permission: {
          type: Boolean,
          default: false,
        },
        token: {
          type: String,
          default: "",
        },
    },
    isEmailVerified: { type: Boolean, default:false },
    passcode:{ type: String, default: null },
    isSetPasscode:{ type: Boolean, default:false },
    status: { type: String, default: "ACTIVE" },
    providerData:{ type: Object, default: null },
    providerUserId:{ type: String, default: null },
    providerType:{ type: String, default: "EMAIL" },
}, {
    timestamps: true
});


UsersSchema.plugin(dataTables);
UsersSchema.index({
    "email":1
},{"unique":true});

module.exports = mongoose.model("Users", UsersSchema, "Users");
