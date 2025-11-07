# Security Policy

## Overview

Bestie Voice Agent is designed for **local/personal use** with security best practices implemented. However, additional hardening is required for production deployments.

## Security Features

### ✅ Implemented Protections

1. **Command Injection Prevention**
   - All subprocess calls use list arguments instead of shell=True
   - User input never directly concatenated into shell commands

2. **Path Traversal Protection**
   - Filename validation with regex patterns
   - Path resolution verification
   - Only serving files from temp directory

3. **Input Validation**
   - File type restrictions (audio files only)
   - File size limits (10MB maximum)
   - Content-type validation

4. **Privacy First**
   - All processing local (no external API calls except localhost)
   - No data logging or telemetry
   - Temporary files in system temp directory

## Known Limitations (Local Use Only)

### ⚠️ Not Suitable for Production Without Changes

1. **CORS Configuration**
   - Currently allows all origins (`allow_origins=["*"]`)
   - **Action Required**: Specify exact domains in production

2. **No Authentication**
   - No user authentication or authorization
   - **Action Required**: Add OAuth2/JWT for multi-user deployments

3. **No Rate Limiting**
   - Unlimited requests per client
   - **Action Required**: Implement rate limiting middleware

4. **No HTTPS**
   - Development server uses HTTP
   - **Action Required**: Deploy behind reverse proxy with TLS

5. **Temp File Cleanup**
   - TTS files accumulate in /tmp
   - **Action Required**: Implement periodic cleanup job

## Reporting Security Issues

If you discover a security vulnerability, please email: [your-email@example.com]

**Please do NOT create public GitHub issues for security vulnerabilities.**

## Best Practices for Users

### For Local Use (Current State)

✅ Safe to use as-is for:
- Personal projects on localhost
- Single-user local deployments
- Development and testing

### For Production Deployment

If you plan to deploy this publicly:

1. **Network Security**
   ```python
   # Update backend/main.py CORS:
   allow_origins=["https://your-domain.com"]
   ```

2. **Add Authentication**
   ```python
   from fastapi.security import HTTPBearer
   security = HTTPBearer()
   
   @app.post("/api/transcribe")
   async def transcribe(credentials: HTTPAuthorizationCredentials = Depends(security)):
       # Verify token
   ```

3. **Rate Limiting**
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   
   @app.post("/api/transcribe")
   @limiter.limit("10/minute")
   async def transcribe(...):
   ```

4. **Deploy Behind Reverse Proxy**
   ```nginx
   # nginx example
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:8000;
       }
   }
   ```

5. **Add Logging & Monitoring**
   ```python
   import logging
   logging.basicConfig(level=logging.INFO)
   
   @app.middleware("http")
   async def log_requests(request: Request, call_next):
       logging.info(f"{request.method} {request.url}")
       return await call_next(request)
   ```

6. **Environment Variables**
   ```python
   from dotenv import load_dotenv
   load_dotenv()
   
   SECRET_KEY = os.getenv("SECRET_KEY")  # Don't hardcode secrets
   ```

## Security Checklist for Production

- [ ] Update CORS to specific origins
- [ ] Implement authentication (OAuth2/JWT)
- [ ] Add rate limiting
- [ ] Deploy with HTTPS/TLS
- [ ] Set up logging and monitoring
- [ ] Implement temp file cleanup
- [ ] Use environment variables for secrets
- [ ] Add input sanitization middleware
- [ ] Set up firewall rules
- [ ] Regular dependency updates
- [ ] Security headers (HSTS, CSP, etc.)
- [ ] Error messages don't leak info

## Dependencies Security

### Regular Updates

Keep dependencies updated:

```bash
# Backend
pip list --outdated
pip install --upgrade -r requirements.txt

# Frontend
npm outdated
npm update
```

### Known Vulnerabilities

Check for vulnerabilities:

```bash
# Python
pip install safety
safety check

# Node.js
npm audit
npm audit fix
```

## Secure Development Practices

1. **Never commit secrets** (.env files are gitignored)
2. **Review PRs** for security implications
3. **Test inputs** with malicious payloads
4. **Keep dependencies updated**
5. **Use static analysis tools**

## License

This security policy is part of the Bestie Voice Agent project and follows the same MIT License.

---

**Last Updated**: 2025-11-07

