
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const dataTables = require('mongoose-datatables');

const OtpAuthSchema = new Schema({
    _id: { type: Schema.ObjectId, auto: true },
    qrUrl: { type: String, default: null },
    userId: { type: String, default: "USER" },
    deviceId:{ type: String, default: null },
    secret:{ type: String, default: null },
    userName:{ type: String, default: null },
    issuer:{ type: String, default: null },
    qrObj:{ type:Object},
}, {
    timestamps: true
});


OtpAuthSchema.plugin(dataTables);
OtpAuthSchema.index({
    "issuer":1
});



module.exports = mongoose.model("OtpAuth", OtpAuthSchema, "OtpAuth");
