# How to Access PostgreSQL Database

## Method 1: Using Docker Exec (Command Line)

### From your server terminal:

```bash
# Access PostgreSQL command line
docker exec -it medgram_db psql -U medgram_admin -d medgram_db

# Or using the postgres user
docker exec -it medgram_db psql -U medgram_admin -d medgram_db
```

### Common PostgreSQL Commands:
```sql
-- List all tables
\dt

-- List all databases
\l

-- Describe a table structure
\d users
\d posts

-- Run a query
SELECT * FROM users;
SELECT * FROM posts;

-- Exit
\q
```

## Method 2: Temporarily Expose Port (For Database Tools)

If you need to use a database management tool (pgAdmin, DBeaver, etc.), you can temporarily expose the port:

1. Edit `docker-compose.yml` and uncomment/add the ports section:
```yaml
ports:
  - "5432:5432"
```

2. Redeploy the stack

3. Connect using:
   - **Host:** Your server IP (74.208.158.126)
   - **Port:** 5432
   - **Database:** medgram_db
   - **Username:** medgram_admin
   - **Password:** secure_password_change_me

4. **IMPORTANT:** Remove the port mapping after you're done for security!

## Method 3: SSH Tunneling (Most Secure for External Access)

From your local machine:

```bash
# Create SSH tunnel
ssh -L 5432:localhost:5432 user@74.208.158.126

# Then connect to localhost:5432 from your database tool
```

## Method 4: Using Portainer Exec

1. Go to Portainer → Containers
2. Find `medgram_db` container
3. Click "Console" or "Exec"
4. Run: `psql -U medgram_admin -d medgram_db`

