const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// स्टैटिक फाइलों (HTML, CSS, JS) को सर्व करने के लिए
app.use(express.static(path.join(__dirname)));

// 1. MongoDB Atlas कनेक्शन (आपका यूआरएल और पासवर्ड यहाँ जोड़ दिया गया है)
const MONGO_URI = "mongodb+srv://jsjhshjsjhsh27_db_user:oBkPjDgdDFwNW4Vk@cluster0.jkpmhai.mongodb.net/tatapay_db?retryWrites=true&w=majority";

// पुराने options (useNewUrlParser, useUnifiedTopology) यहाँ से हटा दिए गए हैं
mongoose.connect(MONGO_URI)
.then(() => {
    console.log("✅ MongoDB Atlas successfully connected to Tata Pay database!");
})
.catch(err => {
    console.error("❌ MongoDB connection error:", err);
});

// 2. Mongoose Schemas & Models (डेटाबेस स्ट्रक्चर)

// यूजर और रजिस्ट्रेशन Schema
const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userId: { type: String, default: "10001" },
    inviteCode: { type: String },
    balance: { type: Number, default: 674.22 },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// बैंक अकाउंट Schema
const bankSchema = new mongoose.Schema({
    phone: { type: String, required: true },
    accountHolder: String,
    accountNumber: String,
    bankName: String,
    ifsc: String,
    upiId: String,
    createdAt: { type: Date, default: Date.now }
});
const Bank = mongoose.model('Bank', bankSchema);

// रिचार्ज और डिपॉजिट हिस्ट्री Schema
const rechargeSchema = new mongoose.Schema({
    phone: { type: String, required: true },
    amount: Number,
    income: Number,
    quota: Number,
    utr: String,
    status: { type: String, default: 'In Payment' },
    currency: { type: String, default: 'INR' },
    createdAt: { type: Date, default: Date.now }
});
const Recharge = mongoose.model('Recharge', rechargeSchema);

// टोकन और कमीशन हिस्ट्री Schema
const tokenHistorySchema = new mongoose.Schema({
    phone: { type: String, required: true },
    type: String, 
    amount: String,
    utr: String,
    desc: String,
    createdAt: { type: Date, default: Date.now }
});
const TokenHistory = mongoose.model('TokenHistory', tokenHistorySchema);


// 3. API Routes (फ्रंटएंड से डेटा लेन-देन के लिए)

// यूजर रजिस्ट्रेशन API
app.post('/api/register', async (req, res) => {
    try {
        const { phone, password, inviteCode } = req.body;
        let existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Phone number already registered!" });
        }
        
        const count = await User.countDocuments();
        const newUserId = String(10001 + count);

        const newUser = new User({ phone, password, inviteCode, userId: newUserId });
        await newUser.save();
        
        res.json({ success: true, message: "Registration successful!", userId: newUserId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// यूजर लॉगिन API
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone, password });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid phone number or password!" });
        }
        res.json({ success: true, message: "Login successful!", userId: user.userId, phone: user.phone });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// /regist यूआरएल के लिए HTML फाइल भेजना
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html')); // अगर आपकी फाइल का नाम regist.html है
});

// बैंक अकाउंट सेव करने की API
app.post('/api/save-bank', async (req, res) => {
    try {
        const { phone, accountHolder, accountNumber, bankName, ifsc, upiId } = req.body;
        await Bank.findOneAndUpdate(
            { phone }, 
            { accountHolder, accountNumber, bankName, ifsc, upiId }, 
            { upsert: true, new: true }
        );
        res.json({ success: true, message: "Bank account saved successfully in MongoDB Atlas!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// बैंक डिटेल्स फेच करने की API
app.get('/api/get-bank/:phone', async (req, res) => {
    try {
        const bankData = await Bank.findOne({ phone: req.params.phone });
        res.json({ success: true, data: bankData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// नया रिचार्ज/टास्क आर्डर सबमिट करने की API
app.post('/api/add-recharge', async (req, res) => {
    try {
        const { phone, amount, income, quota, utr, currency } = req.body;
        const newRecharge = new Recharge({ phone, amount, income, quota, utr, currency });
        await newRecharge.save();
        res.json({ success: true, message: "Recharge order saved to MongoDB Atlas!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// रिचार्ज हिस्ट्री फेच करने की API
app.get('/api/recharge-history/:phone', async (req, res) => {
    try {
        const history = await Recharge.find({ phone: req.params.phone }).sort({ createdAt: -1 });
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// सर्वर स्टार्ट करना
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Tata Pay Server is running live on http://localhost:${PORT}`);
});