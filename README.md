# GrowLoan - Advanced Loan Application System with Firebase

A modern, full-stack loan application system with **Firebase Phone Authentication**, built with Node.js, MongoDB, and React.

## Features

- **Firebase Phone Authentication** - Secure OTP-based login/signup via Firebase
- **Loan Application System** - Easy loan application with amount selection
- **1-minute Validation Process** - Real-time countdown timer
- **Random Loan Approval** - Automatic approval with random amount (50-100% of requested)
- **Payment Processing** - Configurable deposit amount (default ₹149)
- **Loan Status Tracking** - Complete application lifecycle tracking
- **15-day Processing Time** - Automatic completion date calculation
- **Admin Configuration** - Update deposit amount and processing days
- **Modern Mobile-First UI/UX** - Purple gradient design, responsive layout
- **Privacy Policy Integration** - Terms and conditions checkbox

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose, Firebase Admin SDK
- **Frontend**: React, React Router, Axios, React Toastify, Firebase SDK
- **Database**: MongoDB Atlas
- **Authentication**: Firebase Phone Auth + JWT Tokens

## Firebase Setup Required

**IMPORTANT**: Before running the application, you need to set up Firebase:

1. See `FIREBASE_SETUP.md` for detailed setup instructions
2. Create Firebase project at [Firebase Console](https://console.firebase.google.com/)
3. Enable Phone Authentication
4. Get Firebase config and update `frontend/src/config/firebase.js`
5. Setup Firebase Admin SDK (see `FIREBASE_SETUP.md`)

## Project Structure

```
growloan/
├── backend/
│   ├── config/
│   │   ├── firebaseAdmin.js    # Firebase Admin SDK config
│   │   └── serviceAccountKey.json  # (Add your Firebase service account key here)
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Loan.js              # Loan model with all fields
│   │   └── AdminConfig.js       # Admin configuration
│   ├── routes/
│   │   ├── auth.js              # Firebase authentication routes
│   │   ├── loans.js             # Loan application APIs
│   │   └── admin.js             # Admin configuration APIs
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.js      # Firebase client config
│   │   ├── pages/
│   │   │   ├── Login.js         # Firebase Phone Auth login
│   │   │   ├── Signup.js         # Same as Login (OTP-based)
│   │   │   ├── Home.js           # Loan application dashboard
│   │   │   └── LoanApplications.js  # Application list
│   │   ├── context/
│   │   │   └── AuthContext.js    # Authentication context
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── FIREBASE_SETUP.md            # Firebase setup guide
└── README.md
```

## Setup Instructions

### Prerequisites

1. Firebase project with Phone Authentication enabled
2. Node.js and npm installed
3. MongoDB Atlas connection (already configured)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Setup Firebase Admin SDK:
   - **Option A**: Download service account key from Firebase Console and save as `config/serviceAccountKey.json`
   - **Option B**: Add Firebase credentials to `.env` file (see `.env.example`)

4. Create `.env` file (optional, MongoDB already configured in server.js):
```
MONGODB_URI=mongodb+srv://khuntakash1211_db_user:lZH3uGqPnScmNLJS@cluster0.ax0teyf.mongodb.net/growloan?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
PORT=5000
NODE_ENV=development
```

5. Start the backend server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. **Configure Firebase** (REQUIRED):
   - Open `src/config/firebase.js`
   - Replace placeholder values with your Firebase project config
   - Get config from Firebase Console > Project Settings > Your apps

4. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication (Firebase-based)
- `POST /api/auth/check-user` - Check if user exists
  - Body: `{ "phone": "+91XXXXXXXXXX" }`
- `POST /api/auth/verify-firebase` - Verify Firebase ID token and login/signup
  - Body: `{ "idToken": "firebase-id-token", "phoneNumber": "+91XXXXXXXXXX", "name": "User Name" }` (name required for new users)
- `GET /api/auth/me` - Get current user (Protected)
- `PUT /api/auth/profile` - Update user profile (Protected)

### Loans
- `POST /api/loans/apply` - Apply for a loan (Protected)
  - Body: `{ "requestedAmount": 50000 }`
- `POST /api/loans/:loanId/validate` - Start validation process (Protected)
- `GET /api/loans/:loanId/status` - Get loan status (Protected)
- `POST /api/loans/:loanId/payment` - Process payment (Protected)
  - Body: `{ "paymentMethod": "online" }` (optional)
- `GET /api/loans` - Get all user loans (Protected)

### Admin
- `GET /api/admin/config` - Get admin configuration
- `PUT /api/admin/config` - Update admin configuration
  - Body: `{ "depositAmount": 149, "processingDays": 15 }`
- `GET /api/admin/loans` - Get all loans (Admin view)

## Application Flow

1. **Firebase Phone Authentication**: 
   - User enters phone number
   - Firebase sends OTP via SMS
   - User verifies OTP (new users provide name)
   - Firebase ID token generated
   - Backend verifies token and creates/updates user
   - JWT token issued for backend API

2. **Loan Application**: 
   - User enters loan amount
   - Application submitted with status "pending"

3. **Validation**: 
   - User starts 1-minute validation
   - Real-time countdown timer
   - Status changes to "validating"

4. **Auto-Approval**: 
   - After 1 minute, loan automatically approved
   - Random approved amount (50-100% of requested)
   - Status changes to "approved"

5. **Payment**: 
   - User pays deposit amount (configurable, default ₹149)
   - Payment ID generated
   - Status changes to "processing"

6. **Processing**: 
   - 15-day processing period (configurable)
   - Expected completion date calculated
   - Status remains "processing"

7. **Tracking**: 
   - User can view all applications
   - See status, amounts, dates, and progress

## Firebase Configuration

### Frontend Config
Update `frontend/src/config/firebase.js` with your Firebase project config:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Backend Config
**Option 1**: Download service account key from Firebase Console and save as `backend/config/serviceAccountKey.json`

**Option 2**: Add to `.env`:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
# ... (see .env.example for all fields)
```

## Default Configuration

- **Deposit Amount**: ₹149 (configurable via admin API)
- **Processing Days**: 15 days (configurable)
- **Validation Time**: 1 minute (60 seconds)
- **OTP Length**: 6 digits (Firebase standard)

## Development Notes

- Firebase handles OTP delivery via SMS
- reCAPTCHA is automatically handled by Firebase (invisible)
- JWT tokens expire in 30 days
- All dates stored in UTC
- Loan IDs auto-generated in format: LOAN00000001, LOAN00000002, etc.

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Update `JWT_SECRET` to a strong random string
3. Configure Firebase for production domain
4. Add production domain to Firebase authorized domains
5. Build frontend: `cd frontend && npm run build`
6. Serve frontend build with backend or separate server
7. Enable CORS for production domain
8. Add rate limiting for API endpoints
9. Enable HTTPS
10. Set up MongoDB connection pooling

## Security Considerations

- Firebase handles phone number validation
- Firebase ID tokens verified on backend
- OTP delivered securely via Firebase
- JWT tokens required for protected routes
- Input validation on all endpoints
- CORS configured for frontend origin
- Service account key never committed to git

## Troubleshooting

### Firebase OTP not received
- Check Firebase Console > Authentication > Users
- Verify phone number format (+91XXXXXXXXXX)
- Check Firebase project billing status
- For testing, add phone to test numbers in Firebase Console

### Firebase Admin SDK error
- Verify service account key file exists
- Check environment variables are set correctly
- Ensure private key is properly formatted

### reCAPTCHA errors
- Verify domain is authorized in Firebase Console
- Check browser console for errors
- Clear browser cache

## Support

For Firebase setup help, see `FIREBASE_SETUP.md`
For issues or questions, check the code comments or API responses for error messages.
#   g r l  
 