const jwt  = require('jsonwebtoken');
var _= require('lodash');
const CryptoJS = require("crypto-js");


var  Exchange = {
    //Validations Start
        Validations:{

            isAuthenticatedTraders:async function(req, res, next) {
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
                            let traderTokenKey = "tradersToken:"+String(decoded["_id"]);
                            let getTokenInfo = await redisClient.get(traderTokenKey);
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
/*
                            if(getTokenInfo !==  token){
                                err_json= {
                                    meta:{
                                        message:'',
                                        status_code:401,
                                        status:false,
                                    }
                                }
                            
                                return res.status(401).json(err_json);
                            }*/

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
            }
        },//Validation End 
/*=================================================================================================================================*/    
        DataTables:{
            Make:function(param,data){

                var params=param;
                var draw=parseInt(params.draw) || 0;
                var limit = parseInt(params.length, 10);
                var input= params || {};
                var skip = parseInt(params.start, 10);
                var sort = params.sort || {};
                var search = params.search || {};
                var order = params.order || [];
                var columns = params.columns || [];
                var output_data= data || [];
            
                totalRecords=output_data.length;
                totalFiltered=output_data.length;
                if(totalRecords > 0){
                    if (search && search.value){
                        var searchVal=new RegExp(search.value,'i');
                          
                        var searchData= _.filter(data,function(element){
                                var array_string=JSON.stringify(element);           
                                    return array_string.match(searchVal)
                                });
                        output_data=searchData;
                        totalFiltered=searchData.length;
                     }//search
            
                    if (order && columns) {
                        const sortByOrder = order.reduce((memo, ordr) => {
                          const column = columns[ordr.column];
                          memo[column.data] = ordr.dir === 'asc' ? 'asc' : 'desc';
                          return memo;
                        }, {});
                         
                        if (Object.keys(sortByOrder).length) {
                          sort = sortByOrder;
                        }
                      }//order
                        if(sort){
                            var getSortKey=_.first(Object.keys(sort),0);
                            var getSortval=_.first(Object.values(sort));
                            output_data = _.orderBy(output_data, getSortKey, getSortval);
                        }
                        
                        if(limit){
                        var startPoint=skip;
                        var endPoint=skip + limit;
                        output_data = output_data.slice(startPoint,endPoint);
                    }
                        
                }
               
                var response = {};
                response['headers']={};
                response['original']={
                    "draw":draw,
                    "recordsTotal":totalRecords,
                    "recordsFiltered":totalFiltered,
                    "data":output_data
                };
                response['input']=input;
                response['exception']=null;
            
               return response;
            
            }
            
        }



}
module.exports = Exchange