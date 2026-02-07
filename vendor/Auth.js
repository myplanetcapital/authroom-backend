const _ = require("lodash");
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const CryptoJS = require("crypto-js");

let Auth = {
    isAuthenticated:async function(req, res, next) {
        let token = req.headers['x-access-token'] || req.headers['authorization']; 

        if(typeof token != "undefined"){
            if (token.startsWith('Bearer ') ) {
            // Remove Bearer from string
                token = token.slice(7, token.length);
            }
        }else{
            token="";
        }

       
       

        let err_json = {};
        if (token) {
            jwt.verify(token,process.env.JWT_SECRET_KEY,async (err, decoded) => {
              try{
                let decryptedToken = CryptoJS.AES.decrypt(decoded["encryptedToken"],process.env.CRYPTO_KEY,{vi:process.env.CRYPTO_VI}).toString(CryptoJS.enc.Utf8);
                decoded=JSON.parse(decryptedToken);

                console.log(decoded);
               
              }catch(exErr){
                err_json= {
                    meta: {
                        message:"Invalid Token.",
                        status_code: 401,
                        status: false,
                    }
                };
               return res.status(401).json(err_json);

              }
               
              
                if (err) {
                    var error_message="";
                     if(err.name == "TokenExpiredError"){
                        error_message="Token Has Been Expired.";
                     }else if (err.name == "JsonWebTokenError"){
                         error_message="Token Has Invalid Signature.";
                     }else{
                        error_message=err.message;
                     }
                      err_json= {
                         meta: {
                             message: error_message,
                             status_code: 401,
                             status: false,
                         }
                     };
                     return res.status(401).json(err_json);
                } else {
    
                    let userTokenKey = `AUTH_TOKEN:${String(decoded._id)}`;
                
                    console.log(userTokenKey);
                    
                    let getTokenInfo = await redisClient.get(userTokenKey); 
                    console.log(getTokenInfo);
                    if(!getTokenInfo){
                        err_json= {
                            meta:{
                                message:'',
                                status_code:401,
                                status:false,
                            }
                        }
                        
                        return res.status(401).json(err_json);
                    }

                    console.log(getTokenInfo);
                    console.log(token)

                   /* if(decoded.role !== "AGENT"){
                        err_json= {
                            meta:{
                                message:'No Permission To Access.',
                                status_code:401,
                                status:false,
                            }
                        }
                    }*/

                    if(getTokenInfo !==  token){
                        err_json= {
                            meta:{
                                message:'',
                                status_code:401,
                                status:false,
                            }
                        }
                    
                        return res.status(401).json(err_json);
                    }

                    req.decoded = decoded;
                    next();
                }
            });
        } else {
             err_json= {
                meta:{
                    message:'Authorization Token Not Found.',
                    status_code:401,
                    status:false,
                }
            };
            return res.status(401).json(err_json);
        }
    },
   /* isAuthenticatedMgm:async function(req, res, next) {
        let token = req.headers['x-access-token'] || req.headers['authorization']; 

        if(typeof token != "undefined"){
            if (token.startsWith('Bearer ') ) {
            // Remove Bearer from string
                token = token.slice(7, token.length);
            }
        }else{
            token="";
        }

       
       

        let err_json = {};
        if (token) {
            jwt.verify(token,process.env.JWT_SECRET_KEY,async (err, decoded) => {
              try{
                let decryptedToken = CryptoJS.AES.decrypt(decoded["encryptedToken"],process.env.CRYPTO_KEY,{vi:process.env.CRYPTO_VI}).toString(CryptoJS.enc.Utf8);
                decoded=JSON.parse(decryptedToken);

                console.log(decoded);
               
              }catch(exErr){
                err_json= {
                    meta: {
                        message:"Invalid Token.",
                        status_code: 401,
                        status: false,
                    }
                };
               return res.status(401).json(err_json);

              }
               
              
                if (err) {
                    var error_message="";
                     if(err.name == "TokenExpiredError"){
                        error_message="Token Has Been Expired.";
                     }else if (err.name == "JsonWebTokenError"){
                         error_message="Token Has Invalid Signature.";
                     }else{
                        error_message=err.message;
                     }
                      err_json= {
                         meta: {
                             message: error_message,
                             status_code: 401,
                             status: false,
                         }
                     };
                     return res.status(401).json(err_json);
                } else {
    
                    let userTokenKey = `MGM_TOKEN:${String(decoded._id)}`;
                
                    console.log(userTokenKey);
                    
                    let getTokenInfo = await redisClient.get(userTokenKey); 
                    console.log(getTokenInfo);
                    if(!getTokenInfo){
                        err_json= {
                            meta:{
                                message:'',
                                status_code:401,
                                status:false,
                            }
                        }
                        
                        return res.status(401).json(err_json);
                    }

                    console.log(getTokenInfo);
                    console.log(token)

                    if(decoded.role !== "ADMIN"){
                        err_json= {
                            meta:{
                                message:'No Permission To Access.',
                                status_code:401,
                                status:false,
                            }
                        }
                    }

                    if(getTokenInfo !==  token){
                        err_json= {
                            meta:{
                                message:'',
                                status_code:401,
                                status:false,
                            }
                        }
                    
                        return res.status(401).json(err_json);
                    }

                    req.decoded = decoded;
                    next();
                }
            });
        } else {
             err_json= {
                meta:{
                    message:'Authorization Token Not Found.',
                    status_code:401,
                    status:false,
                }
            };
            return res.status(401).json(err_json);
        }
    }*/
};

module.exports = Auth;