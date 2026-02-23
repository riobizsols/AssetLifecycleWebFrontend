# 🎓 Certificate Management - User Guide

## 📖 Overview

The Certificate Management System allows you to:
- **Administrators**: Manage technical certificates and map them to asset types
- **Employees**: Upload and track your technical certificates
- **Managers/HR**: Approve or reject employee certificate uploads

---

## 🗂️ Three Main Features

### 1. 🛠️ Certifications (Administration)
**Access**: Admin Settings → Certifications
**Who**: System Administrators
**What You Can Do**:
- ✅ Create new technical certificates
- ✅ Edit certificate details (name, number)
- ✅ Delete certificates
- ✅ Map certificates to asset types
- ✅ Assign maintenance type requirements

**Example Workflow**:
1. Go to Admin Settings
2. Click "Certifications"
3. Create a new certificate: "PLC Programming Level 1"
4. Assign it to maintenance type "Electrical Maintenance"
5. Map it to relevant asset types (PLCs, Motors, etc.)

---

### 2. 📜 Technician Certificates (Employee)
**Access**: Dashboard → Technician Certificates
**Who**: Employees/Technicians
**What You Can Do**:
- ✅ Upload your technical certificates
- ✅ View your certificate status
- ✅ Download your uploaded certificates
- ✅ Track approval progress

**Step-by-Step Upload**:
1. Navigate to "Technician Certificates"
2. Click "Add New Certificate"
3. Select your employee name (or it auto-fills)
4. Choose the certificate type
5. Enter certificate date (when you got it)
6. Enter expiry date (when it expires)
7. Upload the certificate file (PDF, image, etc.)
8. Click "Upload"
9. Wait for HR/Manager approval

**Status Meanings**:
- 🟡 **Approval Pending**: Waiting for HR/Manager review
- 🟢 **Approved**: Certificate has been verified
- 🔴 **Rejected**: Certificate was denied (you can reupload)

---

### 3. ✅ HR/Manager Approval
**Access**: Dashboard → HR/Manager Approval
**Who**: HR/Managers
**What You Can Do**:
- ✅ Review pending certificate approvals
- ✅ Approve certificates
- ✅ Reject certificates with comments
- ✅ View technician list
- ✅ Track certification status
- ✅ Block technicians if needed

**Approval Workflow**:
1. Navigate to "HR/Manager Approval"
2. Click on "Certificate Approvals" tab
3. Find pending certificates
4. Click approve ✅ or reject ❌
5. Add comments if rejecting
6. Employee receives notification

---

## 🚀 Quick Start

### For Administrators
```
1. Login
2. Go to Admin Settings (sidebar)
3. Click "Certifications"
4. Create your first tech certificate
5. Assign it to asset types and maintenance types
```

### For Employees
```
1. Login
2. Navigate to "Technician Certificates"
3. Click "Add New Certificate"
4. Upload your certificate file
5. Wait for approval
6. Check status in the list
```

### For HR/Managers
```
1. Login
2. Navigate to "HR/Manager Approval"
3. Click "Certificate Approvals" tab
4. Review pending certificates
5. Approve or reject
```

---

## 📋 Common Tasks

### Create a New Certificate (Admin)
1. Admin Settings → Certifications → Create Certificate tab
2. Enter Certificate Name: "Welding Certification Level 2"
3. Enter Certificate Number: "WLD-002"
4. Click "Create"
5. Done! ✅

### Upload a Certificate (Employee)
1. Technician Certificates → Add New Certificate
2. Select: "Employee Name" → "Certificate Type" → "Dates" → "File"
3. Click "Upload"
4. Check status in the list below
5. Done! ✅

### Map Certificate to Asset Type (Admin)
1. Admin Settings → Certifications → Mapping tab
2. Select Asset Type
3. Select Maintenance Type
4. Choose Certificates required
5. Click "Save"
6. Done! ✅

### Approve a Certificate (HR/Manager)
1. HR/Manager Approval → Certificate Approvals
2. Find employee's pending certificate
3. Click approve ✅ or reject ❌
4. Add comment if rejecting
5. Employee gets notified
6. Done! ✅

---

## 📊 Certificate Approval Workflow

```
Employee Uploads
       ↓
🟡 Approval Pending (Waiting for HR/Manager)
       ↓
HR/Manager Reviews
       ↓
    ↙️  ↘️
  ✅ Approved    ❌ Rejected
    ↓              ↓
🟢 Active      🔴 Review Again
    ↓
   Can use for
   maintenance
```

---

## ✨ Features

### 🔐 Security
- Only authenticated users can access
- Role-based permissions (Admin, Employee, Manager)
- File upload validation
- Data encryption

### 📱 Mobile Friendly
- Responsive design
- Works on desktop and mobile
- Touch-friendly buttons

### 💾 Data Management
- Secure file storage
- Download certificates anytime
- Audit trail of approvals
- Status tracking

### 🔔 Notifications
- Email notification when
  - Certificate is approved
  - Certificate is rejected
  - Certificate expires soon
  - New approval request arrives

---

## 🆘 Troubleshooting

### Can't see Certificate pages?
- ✅ Check your user role has permission
- ✅ Clear browser cache (Ctrl+Shift+Delete)
- ✅ Logout and login again
- ✅ Refresh page (F5)

### Upload fails?
- ✅ Check file size (max 10MB)
- ✅ Verify file format (PDF, JPG, PNG)
- ✅ Check network connection
- ✅ Try different browser

### Can't find a certificate?
- ✅ Use search/filter function
- ✅ Check status dropdown
- ✅ Search by employee name
- ✅ Check date range

### Approval not working?
- ✅ Verify you have manager role
- ✅ Refresh the page
- ✅ Check if certificate is still pending
- ✅ Try another browser

---

## 📞 Need Help?

### Check These Resources
1. 📘 **Admin Guide**: CERTIFICATE_INTEGRATION_GUIDE.md
2. 📄 **Setup Guide**: CERTIFICATE_SETUP_COMPLETE.md
3. 💻 **System Logs**: Check browser console (F12)

### Contact Support
- Report issues with detailed screenshot
- Include error message from browser console
- Mention your job role and what you were trying to do

---

## 🎯 Key Points to Remember

✅ **Employees**: Always ensure certificates are uploaded before expiry
✅ **Managers**: Review approvals regularly to not delay technicians
✅ **Admins**: Set up certificate requirements per asset type
✅ **Everyone**: Keep file uploads organized with clear naming

---

## 📅 Certificate Lifecycle

```
UPLOADED
   ↓
APPROVAL PENDING (3-5 days)
   ↓
APPROVED
   ↓
VALID (until expiry date)
   ↓
EXPIRED (notification sent)
   ↓
REQUIRES RENEWAL
```

---

## ✅ Checklist Before Going Live

- [ ] All required roles created
- [ ] Administrators trained
- [ ] Employees notified
- [ ] Certificates defined in system
- [ ] Approvers assigned
- [ ] Test uploads completed
- [ ] Notification system tested

---

## 🎓 Additional Notes

- Certificates can be uploaded anytime
- Managers should respond to approvals within 5 business days
- Expired certificates are automatically highlighted
- All uploads are logged for audit purposes
- Files are securely stored with encryption

---

## 🚀 You're All Set!

Start using the Certificate Management System now! If you have any questions, refer to the guides or contact your administrator.

**Happy certificate managing! 🎉**

