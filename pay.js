import { createRouter } from 'next-connect';
import db from '../../../utils/db';
import Transaction from '../../../models/Transaction';
import axios from 'axios';
import moment from 'moment';

const router = createRouter();

async function getAccessToken() {
  const consumer_key = process.env.consumer_key; 
  const consumer_secret = process.env.consumer_secret; // REPLACE IT WITH YOUR CONSUMER SECRET
  const url =
    "https://api.safaricom.co.ke/oauth/v2/generate?grant_type=client_credentials";

  const auth =
    "Basic " +
    new Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: auth,
      },
    });
    const accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    throw error;
  }
}

router.put( async (req, res) => {
  let phoneNumber = req.body.phone;
  const amount = req.body.amount;

  if (phoneNumber.startsWith("0")) {
    phoneNumber = "254" + phoneNumber.slice(1);
  }

  getAccessToken()
    .then((accessToken) => {
      const url =
        "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
      const auth = `Bearer ${accessToken}`;
      const timestamp = moment().format("YYYYMMDDHHmmss");
      const password = new Buffer.from(
        process.env.shortcode +
        process.env.pass_key +
        timestamp
      ).toString("base64");

      axios
        .post(
          url,
          {
            BusinessShortCode: process.env.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: process.env.shortcode,
            PhoneNumber: phoneNumber,
            CallBackURL: process.env.callback_url,
            AccountReference: 'AtKevs',
            TransactionDesc: "Order Payment",
          },
          {
            headers: {
              'Authorization': auth,
              'Content-Type': 'application/json'
            },
          }
        )
        .then((response) => {
          // res.send("😀 Request is successful done ✔✔. Please enter mpesa pin to complete the transaction");
          //SEND BACK A JSON RESPONSE TO THE CLIENT
          console.log(response.data);
          res.status(200).json({
            msg: "Request is successful done ✔✔. Please enter mpesa pin to complete the transaction",
            status: true,
          });

        })
        .catch((error) => {
          console.log(error);
          //res.status(500).send("❌ Request failed");
          console.log(error);
          res.status(500).json({
            msg: "Request failed",
            status: false,
          });
        });
    })
    .catch(console.log);
});

router.post(async (req, res ) => { 
  console.log(req.body);

    await db.connect();
      console.log("db is connected");
      const newTransaction = new Transaction({
        Phone: req.body.Body.stkCallback.CallbackMetadata.Item[4].Value,
        Code: req.body.Body.stkCallback.CallbackMetadata.Item[1].Value,
        Amount: req.body.Body.stkCallback.CallbackMetadata.Item[0].Value,
        isNewtransac: true,
      }); 

      const transaction = await newTransaction.save();
      console.log(newTransaction);
      console.log(transaction);
    await db.disconnect(); 
    console.log('db is disconnected');
  

  res.status(200).end()
});

export default router.handler();
