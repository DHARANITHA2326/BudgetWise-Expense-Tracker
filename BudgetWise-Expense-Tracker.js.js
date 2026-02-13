const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const multer = require("multer");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const upload = multer({ storage: multer.memoryStorage() });

let users = [];
let expenses = [];
let income = 0;
let budget = 0;
let otps = {};
let transporter;

nodemailer.createTestAccount().then(testAccount => {
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  console.log("ETHEREAL MAIL READY ✅");
});

function page(body) {
  return `
<!DOCTYPE html>
<html>
<head>
<title>BudgetWise</title>
<style>
body{
  margin:0;
  font-family:Arial;
  background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);
  color:white;
}
button{
  padding:6px 12px;
  border:none;
  border-radius:6px;
  cursor:pointer;
}
a{text-decoration:none;color:white}
.card{
  background:#1f2937;
  padding:20px;
  border-radius:12px;
  margin-bottom:20px;
}
input,select{
  width:100%;
  padding:8px;
  margin:6px 0;
}
table{
  width:100%;
  border-collapse:collapse;
}
th,td{
  padding:8px;
  border-bottom:1px solid #444;
  text-align:center;
}
.topbar{
  background:#6d5dfc;
  padding:15px;
  display:flex;
  justify-content:space-between;
}
.summary{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:15px;
}
.summary div{
  background:#6d5dfc;
  padding:15px;
  border-radius:12px;
  text-align:center;
}
.container{padding:30px}
.small{font-size:14px}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

/* ================= LANDING ================= */
app.get("/", (req, res) => {
  res.send(page(`
  <div class="container" style="text-align:center;margin-top:100px">
    <h1>💰 BudgetWise</h1>
    <p>Smart Expense Dashboard</p>
    <a href="/login"><button style="background:#00c6ff">Login</button></a>
    <a href="/signup"><button style="background:#38ef7d;color:black">Sign Up</button></a>
  </div>
  `));
});

/* ================= LOGIN ================= */
app.get("/login", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Login</title>
<style>
body{
  background:#203a43;
  display:flex;
  justify-content:center;
  align-items:center;
  height:100vh;
  font-family:Arial;
}
.card{
  background:white;
  padding:30px;
  width:320px;
  border-radius:10px;
  text-align:center;
}
input,button{
  width:100%;
  padding:10px;
  margin:8px 0;
}
button{
  background:#0072ff;
  color:white;
  border:none;
}
</style>
</head>
<body>
<div class="card">
<h2>Login</h2>
<form method="POST" action="/login">
  <input name="email" placeholder="Email" required>
  <input type="password" name="password" placeholder="Password" required>
  <button>Login</button>
</form>
<p>New user? <a href="/signup">Create account</a></p>
</div>
</body>
</html>
`);
});

/* ================= SIGNUP ================= */
app.get("/signup", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Signup</title>
<style>
body{
  background:#0f2027;
  display:flex;
  justify-content:center;
  align-items:center;
  height:100vh;
  font-family:Arial;
}
.card{
  background:white;
  padding:30px;
  width:340px;
  border-radius:10px;
  text-align:center;
}
input,select,button{
  width:100%;
  padding:10px;
  margin:8px 0;
}
button{
  background:#38ef7d;
  border:none;
}
</style>
</head>
<body>
<div class="card">
<h2>Sign Up</h2>
<form method="POST" action="/signup">
  <input name="fname" placeholder="First Name" required>
  <input name="lname" placeholder="Last Name" required>
  <select name="gender" required>
    <option value="">Select Gender</option>
    <option>Male</option>
    <option>Female</option>
  </select>
  <input name="dept" placeholder="Department" required>
  <input name="email" placeholder="Email" required>
  <input type="password" name="password" placeholder="Password" required>
  <button>Create Account</button>
</form>
<p>Already have an account? <a href="/login">Login</a></p>
</div>
</body>
</html>
`);
});



/* ================= AUTH LOGIC ================= */
app.post("/signup",(req,res)=>{
  const otp = Math.floor(100000 + Math.random() * 900000);

  otps[req.body.email] = otp;

  // Store user locally instead of DB
  users.push({
    fname: req.body.fname,
    lname: req.body.lname,
    gender: req.body.gender,
    dept: req.body.dept,
    email: req.body.email,
    password: req.body.password,
    image: null,
    verified: false
  });

  transporter.sendMail({
  from: "BudgetWise <no-reply@budgetwise.com>",
  to: req.body.email,
  subject: "BudgetWise OTP Verification",
  text: `Your OTP is ${otp}`
}, (err, info) => {

  if (err) {
    console.log("Mail error:", err);
    return;
  }

  console.log("OTP MAIL SENT ✅");
  console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
});


  res.redirect("/login");


});
app.post("/login",(req,res)=>{

  const { email, password, otp } = req.body;

  const u = users.find(
    x => x.email === email && x.password === password
  );

  if(!u) return res.send("Invalid Email or Password ❌");

  // STEP 1: If OTP not entered yet
  if(!otp){

    if(!otps[email]){
      const newOtp = Math.floor(100000 + Math.random() * 900000);
      otps[email] = newOtp;

      transporter.sendMail({
        from: "BudgetWise <no-reply@budgetwise.com>",
        to: email,
        subject: "Login OTP Verification",
        text: `Your Login OTP is ${newOtp}`
      });

      console.log("OTP Sent:", newOtp);
    }

    return res.send(`
      <html>
      <body style="background:#203a43;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial">
        <div style="background:white;padding:30px;width:320px;border-radius:10px;text-align:center">
          <h2>Enter OTP</h2>
          <form method="POST" action="/login">
            <input type="hidden" name="email" value="${email}">
            <input type="hidden" name="password" value="${password}">
            <input name="otp" placeholder="Enter OTP" required style="width:100%;padding:10px;margin:8px 0">
            <button style="width:100%;padding:10px;background:#0072ff;color:white;border:none">Verify OTP</button>
          </form>
        </div>
      </body>
      </html>
    `);
  }

  // STEP 2: Verify OTP
  if(otps[email] == otp){
    delete otps[email];
    return res.redirect("/dashboard");
  } else {
    return res.send("Invalid OTP ❌");
  }

});


// ================= DASHBOARD & REST =================
app.get("/dashboard",(req,res)=>{
  let totalExpense = expenses.reduce((s,e)=>s+Number(e.amount),0);
  let balance = income - totalExpense;

  let alertMessage = "";
  if(totalExpense > budget && budget > 0){
    alertMessage = `
      <div style="background:red;padding:10px;border-radius:8px;margin-bottom:15px">
        ⚠ Budget Exceeded! You spent more than your budget.
      </div>
    `;
  }

  let usedPercent = budget ? ((totalExpense/budget)*100).toFixed(1) : 0;

  let categoryTotal = {};
  expenses.forEach(e=>{
    categoryTotal[e.category]=(categoryTotal[e.category]||0)+Number(e.amount);
  });

  let rows = expenses.map((e,i)=>`
    <tr>
      <td>${e.amount}</td>
      <td>${e.category}</td>
      <td>${e.date}</td>
      <td>
        <a href="/edit/${i}">✏️</a>
        <a href="/delete/${i}">🗑️</a>
      </td>
    </tr>
  `).join("");

  res.send(page(`
<div style="display:flex">

  <!-- Sidebar -->
  <div style="width:220px;background:#111827;padding:20px;height:100vh">
    <h3>BudgetWise</h3>
    <a href="/dashboard">Dashboard</a><br><br>
    <a href="/statistics">Statistics</a><br><br>
    <a href="/">Logout</a>
  </div>

  <!-- Main Content -->
  <div style="flex:1;padding:20px">

    <div style="display:flex;justify-content:space-between;align-items:center">

  <div>
    <h2>BudgetWise Dashboard</h2>
    <p style="margin:5px 0;font-size:16px">
      Welcome, <b>${users[users.length - 1]?.fname}</b> 👋
    </p>
  </div>

  <div style="text-align:center">
    <img 
      src="${users[users.length - 1]?.image || 'https://via.placeholder.com/50'}"
      onclick="openProfile()"
      style="width:50px;height:50px;border-radius:50%;cursor:pointer"
    >
  </div>

</div>



    ${alertMessage}

    <div class="card">
      <h3>Income & Budget</h3>
      <form method="POST" action="/set-income">
        <input name="income" placeholder="Monthly Income">
        <input name="budget" placeholder="Monthly Budget">
        <button style="background:#38ef7d">Save</button>
      </form>
    </div>

    <div class="summary">
      <div><h4>Income</h4><h2>₹${income}</h2></div>
      <div><h4>Expense</h4><h2>₹${totalExpense}</h2></div>
      <div><h4>Balance</h4><h2>₹${balance}</h2></div>
    </div>

    <div class="card">
      <h4>Budget Utilization</h4>
      <p>${usedPercent}% used | Remaining ₹${budget-totalExpense}</p>
    </div>

    <div class="card">
      <h4>Add Expense</h4>
      <form method="POST" action="/add">
        <input name="amount" placeholder="Amount" required>
        <select name="category">
  <option>Food</option>
  <option>Travel</option>
  <option>Shopping</option>
  <option>Rent</option>
  <option>Savings</option>
  <option>Healthcare</option>
</select>

        <input type="date" name="date" required>
        <button style="background:#6d5dfc">Add</button>
      </form>
    </div>

    <div class="card">
      <h4>Expense History</h4>
      <table>
        <tr><th>Amount</th><th>Category</th><th>Date</th><th>Action</th></tr>
        ${rows}
      </table>
    </div>

    <div class="card">
      <h4>Category Analysis</h4>
      ${Object.keys(categoryTotal).map(c=>`
        <p>${c}: ₹${categoryTotal[c]}</p>
      `).join("")}
    </div>
    <div id="profilePopup" style="
display:none;
position:fixed;
top:0;
left:0;
width:100%;
height:100%;
background:rgba(0,0,0,0.7);
justify-content:center;
align-items:center;
">

  <div style="
    background:#1f2937;
    padding:30px;
    border-radius:12px;
    text-align:center;
    width:300px;
  ">
    <img 
      src="${users[users.length - 1]?.image || 'https://via.placeholder.com/120'}"
      style="width:120px;height:120px;border-radius:50%;object-fit:cover"
    >
    <h3>${users[users.length - 1]?.fname} ${users[users.length - 1]?.lname}</h3>
    <p>${users[users.length - 1]?.email}</p>

    <a href="/profile">
      <button style="background:#00c6ff">Edit Profile</button>
    </a>

    <br><br>
    <button onclick="closeProfile()">Close</button>
  </div>
</div>

<script>
function openProfile(){
  document.getElementById("profilePopup").style.display="flex";
}
function closeProfile(){
  document.getElementById("profilePopup").style.display="none";
}
</script>


  </div>
</div>
  `));
});

app.get("/statistics",(req,res)=>{
  let totalExpense = expenses.reduce((s,e)=>s+Number(e.amount),0);

  let categoryTotal = {};
  expenses.forEach(e=>{
    categoryTotal[e.category]=(categoryTotal[e.category]||0)+Number(e.amount);
  });

  res.send(page(`
  <div style="padding:30px">
    <h2>📊 Expense Statistics</h2>
    <div style="width:400px;height:400px;margin:auto">
  <canvas id="myChart"></canvas>
</div>


    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      const ctx = document.getElementById('myChart');

      new Chart(ctx, {
  type: 'pie',
  data: {
    labels: ${JSON.stringify(Object.keys(categoryTotal))},
    datasets: [{
      data: ${JSON.stringify(Object.values(categoryTotal))},
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false
  }
});

    </script>

    <br><br>
    <a href="/dashboard">⬅ Back</a>
  </div>
  `));
});

app.post("/add",(req,res)=>{
  expenses.push(req.body);
  res.redirect("/dashboard");
});

app.get("/delete/:id",(req,res)=>{
  expenses.splice(req.params.id,1);
  res.redirect("/dashboard");
});

app.get("/edit/:id",(req,res)=>{
  const e = expenses[req.params.id];
  res.send(page(`
  <div class="container">
    <div class="card">
      <h3>Edit Expense</h3>
      <form method="POST" action="/edit/${req.params.id}">
        <input name="amount" value="${e.amount}">
        <input name="category" value="${e.category}">
        <input name="date" value="${e.date}">
        <button style="background:#6d5dfc">Update</button>
      </form>
    </div>
  </div>
  `));
});

app.post("/edit/:id",(req,res)=>{
  expenses[req.params.id]=req.body;
  res.redirect("/dashboard");
});

app.post("/set-income",(req,res)=>{
  income = Number(req.body.income||0);
  budget = Number(req.body.budget||0);
  res.redirect("/dashboard");
});

app.get("/profile",(req,res)=>{
  let user = users[users.length - 1];

  res.send(page(`
    <div class="container">
      <div class="card">
        <h3>Edit Profile</h3>

        <form method="POST" action="/profile" enctype="multipart/form-data">
          <input name="fname" value="${user.fname}" required>
          <input name="lname" value="${user.lname}" required>
          <input name="email" value="${user.email}" readonly>

          <label>Profile Image</label>
          <input type="file" name="image" accept="image/*">

          <button style="background:#38ef7d">Save Profile</button>
        </form>

        <br>
        <a href="/dashboard">⬅ Back</a>
      </div>
    </div>
  `));
    

});

app.post("/profile", upload.single("image"), (req,res)=>{
  let user = users[users.length - 1];

  user.fname = req.body.fname;
  user.lname = req.body.lname;

  if(req.file){
    user.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  }

  res.redirect("/dashboard");
});

app.listen(3000,()=>console.log("Running on http://localhost:3000"));
