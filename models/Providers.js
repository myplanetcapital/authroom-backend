
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const dataTables = require('mongoose-datatables');

const ProvidersSchema = new Schema({
    _id: { type: Schema.ObjectId, auto: true },
    name: { type: String, default: null },
    logo: { type: String, default: null },
    url: { type: String, default: null },
    providerId:{ type: String, default: null },
    status: { type: String, default: "ACTIVE" }
}, {
    timestamps: true
});


ProvidersSchema.plugin(dataTables);
ProvidersSchema.index({
    "providerId":1
});


module.exports = mongoose.model("Providers", ProvidersSchema, "Providers");
