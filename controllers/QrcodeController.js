const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const sharp = require("sharp");
const path = require("path");
const Providers = require("../models/Providers");

const users = {};
exports.generateQRCode = async (req, res) => {

        const  username  = "test";
        const secret = authenticator.generateSecret();
        users[username] = { secret };
    
        const otpauth = authenticator.keyuri(username, 'MyApp', secret);
        
        const logoPath = path.join(__basedir, "logo.png");

        // 1️⃣ Generate QR code as buffer
        const qrBuffer = await QRCode.toBuffer(otpauth, {
            errorCorrectionLevel: "H",
            type: "png",
            width: 500,
            margin: 2,
            color: {
                dark: "#000000",
                light: "#FFFFFF"
            }
        });

        // 2️⃣ Resize logo
        const logoBuffer = await sharp(logoPath)
            .resize(100, 100)
            .png()
            .toBuffer();

        // 3️⃣ Composite logo on QR
        const finalBuffer = await sharp(qrBuffer)
            .composite([
                {
                    input: logoBuffer,
                    gravity: "center"
                }
            ])
            .png()
            .toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        return res.send(finalBuffer);
}

exports.verifyCode = async (req, res) => {

     const  username = "test"
     const token  = req.body.token;
    const user = users[username];
    if (!user) return res.status(404).json({ valid: false, message: 'User not found' });

  const isValid = authenticator.check(token, user.secret);
  res.json({ valid: isValid });

}
   

    /*
        const { username } = req.body;
        const secret = authenticator.generateSecret();
        users[username] = { secret };
    
        const otpauth = authenticator.keyuri(username, 'MyApp', secret);
        console.log(otpauth);
        const qr = await qrcode.toDataURL(otpauth);
    
        res.json({ secret, qr });*/


