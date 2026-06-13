#!/bin/bash
# =============================================================================
# TrafficGuard - Bulletproof Local Startup Script
# =============================================================================
# Starts all services + runs a WATCHDOG that auto-restarts anything that dies.
# Services stay alive until you explicitly run ./stop_local.sh
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Project paths
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Configuration
DB_NAME="trafficguard"
DB_USER="trafficguard_user"
DB_PASSWORD="trafficguard_pass_123"
BACKEND_PORT=3000
AI_SERVICE_PORT=8000
FRONTEND_PORT=5176
WATCHDOG_INTERVAL=10

# Log files
BACKEND_LOG="$PROJECT_DIR/backend.log"
AI_SERVICE_LOG="$PROJECT_DIR/ai_service.log"
FRONTEND_LOG="$PROJECT_DIR/frontend.log"
WATCHDOG_LOG="$PROJECT_DIR/watchdog.log"

# PID files
PID_DIR="$PROJECT_DIR/.pids"
mkdir -p "$PID_DIR"

LOCK_FILE="$PID_DIR/start.lock"

# ─── Helper Functions ────────────────────────────────────────────────────────

log()   { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn()  { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠  $*${NC}"; }
err()   { echo -e "${RED}[$(date '+%H:%M:%S')] ✗  $*${NC}"; }
info()  { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }

kill_port() {
    local port=$1
    local pids
    pids=$(lsof -t -i:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

wait_for_port() {
    local port=$1 name=$2 max=${3:-45} i=0
    while ! nc -z localhost "$port" 2>/dev/null; do
        i=$((i + 1))
        if [ $i -ge "$max" ]; then
            return 1
        fi
        sleep 1
    done
    return 0
}

pid_alive() {
    [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null
}

save_pid() {
    echo "$2" > "$PID_DIR/$1.pid"
}

read_pid() {
    local f="$PID_DIR/$1.pid"
    [ -f "$f" ] && cat "$f" || echo ""
}

# ─── Prevent double-start ───────────────────────────────────────────────────

if [ -f "$LOCK_FILE" ]; then
    OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if pid_alive "$OLD_PID"; then
        echo ""
        warn "TrafficGuard is already running (watchdog PID: $OLD_PID)."
        echo -e "  Run ${CYAN}./stop_local.sh${NC} first, or ${CYAN}./status.sh${NC} to check."
        echo ""
        exit 0
    else
        rm -f "$LOCK_FILE"
    fi
fi

# ─── Banner ──────────────────────────────────────────────────────────────────

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║      TrafficGuard - Bulletproof Local Startup                 ║"
echo "║        Auto-restart watchdog keeps everything alive           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ═════════════════════════════════════════════════════════════════════════════
# STEP 1: Clean up stale processes
# ═════════════════════════════════════════════════════════════════════════════
info "[Step 1/6] Cleaning up stale processes..."
kill_port $BACKEND_PORT
kill_port $AI_SERVICE_PORT
kill_port $FRONTEND_PORT

OLD_WD=$(read_pid watchdog)
if pid_alive "$OLD_WD"; then
    kill "$OLD_WD" 2>/dev/null || true
fi

# ═════════════════════════════════════════════════════════════════════════════
# STEP 2: PostgreSQL Database
# ═════════════════════════════════════════════════════════════════════════════
info "[Step 2/6] Ensuring PostgreSQL is running..."

if ! command -v psql >/dev/null 2>&1; then
    err "PostgreSQL is not installed!"
    echo "  Install: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

ensure_postgres() {
    if ! systemctl is-active --quiet postgresql 2>/dev/null; then
        sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null
        sleep 2
    fi
    local ver cs
    ver=$(pg_lsclusters -h 2>/dev/null | grep "5432" | awk '{print $1}')
    cs=$(pg_lsclusters -h 2>/dev/null | grep "5432" | awk '{print $4}')
    if [ "$cs" != "online" ] && [ -n "$ver" ]; then
        sudo pg_ctlcluster "$ver" main start 2>/dev/null
        sleep 2
    fi
    pg_isready -h localhost -q 2>/dev/null
}

if ensure_postgres; then
    log "✓ PostgreSQL is online (port 5432)"
else
    err "Cannot start PostgreSQL!"
    exit 1
fi

info "Checking database setup..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1 || {
    warn "Creating database user: $DB_USER"
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
}
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1 || {
    warn "Creating database: $DB_NAME"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
}
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null && \
    log "✓ PostGIS extension enabled" || \
    info "PostGIS not available — continuing without spatial features"

if [ -f "$PROJECT_DIR/database/schema.pgsql" ]; then
    TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tc \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
    if [ "${TABLE_COUNT:-0}" -lt 5 ] 2>/dev/null; then
        warn "Initializing database schema..."
        sudo -u postgres psql -d "$DB_NAME" -f "$PROJECT_DIR/database/schema.pgsql" 2>/dev/null
    fi
fi
log "✓ Database ready"

# ═════════════════════════════════════════════════════════════════════════════
# STEP 3: Backend Server
# ═════════════════════════════════════════════════════════════════════════════
info "[Step 3/6] Starting Backend Server..."

cd "$PROJECT_DIR/backend"
[ ! -d "node_modules" ] && { warn "Installing backend deps..."; npm install --silent; }

cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
PORT=$BACKEND_PORT
NODE_ENV=development
JWT_SECRET=trafficguard_jwt_secret_2024
AI_SERVICE_URL=http://localhost:$AI_SERVICE_PORT
FRONTEND_URL=http://localhost:$FRONTEND_PORT
FIREBASE_SERVICE_ACCOUNT_PATH=$PROJECT_DIR/backend/config/firebase-service-account.json
EOF

kill_port $BACKEND_PORT
nohup node src/server.js >> "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
save_pid backend "$BACKEND_PID"

if wait_for_port $BACKEND_PORT "Backend" 30; then
    log "✓ Backend running (PID: $BACKEND_PID) on port $BACKEND_PORT"
else
    err "Backend failed to start — check $BACKEND_LOG"
    exit 1
fi

# ═════════════════════════════════════════════════════════════════════════════
# STEP 4: AI Service
# ═════════════════════════════════════════════════════════════════════════════
info "[Step 4/6] Starting AI Service..."

cd "$PROJECT_DIR/ai_service"

if ! command -v python3 >/dev/null 2>&1; then
    err "Python3 not installed!"
    exit 1
fi

[ ! -d "venv" ] && { warn "Creating Python venv..."; python3 -m venv venv; }

source venv/bin/activate
if [ ! -f "venv/.deps_installed" ]; then
    warn "Installing AI deps..."
    pip install --upgrade pip -q
    pip install -r requirements-light.txt -q 2>/dev/null || pip install -r requirements.txt -q
    touch "venv/.deps_installed"
fi

cat > .env << EOF
BACKEND_URL=http://localhost:$BACKEND_PORT
BACKEND_NOTIFY_SECRET=trafficguard_ai_notify_secret
EOF

kill_port $AI_SERVICE_PORT
nohup python3 -m uvicorn main_light:app --host 0.0.0.0 --port $AI_SERVICE_PORT >> "$AI_SERVICE_LOG" 2>&1 &
AI_PID=$!
save_pid ai_service "$AI_PID"
deactivate 2>/dev/null || true

if wait_for_port $AI_SERVICE_PORT "AI Service" 45; then
    log "✓ AI Service running (PID: $AI_PID) on port $AI_SERVICE_PORT"
else
    warn "AI Service slow to start — watchdog will retry"
fi

# ═════════════════════════════════════════════════════════════════════════════
# STEP 5: Frontend
# ═════════════════════════════════════════════════════════════════════════════
info "[Step 5/6] Starting Frontend..."

cd "$PROJECT_DIR/government-dashboard"
[ ! -d "node_modules" ] && { warn "Installing frontend deps..."; npm install --silent; }

kill_port $FRONTEND_PORT
nohup npx vite --port $FRONTEND_PORT --host >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
save_pid frontend "$FRONTEND_PID"

if wait_for_port $FRONTEND_PORT "Frontend" 30; then
    log "✓ Frontend running (PID: $FRONTEND_PID) on port $FRONTEND_PORT"
else
    warn "Frontend slow — watchdog will retry"
fi

# ═════════════════════════════════════════════════════════════════════════════
# STEP 6: WATCHDOG — keeps everything alive forever
# ═════════════════════════════════════════════════════════════════════════════
info "[Step 6/6] Starting Watchdog Guardian..."

cd "$PROJECT_DIR"

(
    echo "[$(date)] Watchdog started (PID $$, interval ${WATCHDOG_INTERVAL}s)" >> "$WATCHDOG_LOG"
    consecutive_ok=0

    while true; do
        sleep "$WATCHDOG_INTERVAL"
        restarted=""

        # ── PostgreSQL ──
        if ! pg_isready -h localhost -q 2>/dev/null; then
            echo "[$(date)] PostgreSQL DOWN — restarting..." >> "$WATCHDOG_LOG"
            sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null
            sleep 3
            ver=$(pg_lsclusters -h 2>/dev/null | grep "5432" | awk '{print $1}')
            cs=$(pg_lsclusters -h 2>/dev/null | grep "5432" | awk '{print $4}')
            if [ "$cs" != "online" ] && [ -n "$ver" ]; then
                sudo pg_ctlcluster "$ver" main start 2>/dev/null
                sleep 2
            fi
            if pg_isready -h localhost -q 2>/dev/null; then
                echo "[$(date)] PostgreSQL RECOVERED ✓" >> "$WATCHDOG_LOG"
                restarted="${restarted} DB"
            else
                echo "[$(date)] PostgreSQL STILL DOWN ✗" >> "$WATCHDOG_LOG"
            fi
        fi

        # ── Backend ──
        if ! nc -z localhost $BACKEND_PORT 2>/dev/null; then
            echo "[$(date)] Backend DOWN — restarting..." >> "$WATCHDOG_LOG"
            if pg_isready -h localhost -q 2>/dev/null; then
                kill_port $BACKEND_PORT
                cd "$PROJECT_DIR/backend"
                nohup node src/server.js >> "$BACKEND_LOG" 2>&1 &
                save_pid backend "$!"
                sleep 4
                if nc -z localhost $BACKEND_PORT 2>/dev/null; then
                    echo "[$(date)] Backend RECOVERED ✓ (PID $!)" >> "$WATCHDOG_LOG"
                    restarted="${restarted} Backend"
                else
                    echo "[$(date)] Backend STILL DOWN ✗" >> "$WATCHDOG_LOG"
                fi
            else
                echo "[$(date)] Skipping backend — DB is down" >> "$WATCHDOG_LOG"
            fi
        fi

        # ── AI Service ──
        if ! nc -z localhost $AI_SERVICE_PORT 2>/dev/null; then
            echo "[$(date)] AI Service DOWN — restarting..." >> "$WATCHDOG_LOG"
            kill_port $AI_SERVICE_PORT
            cd "$PROJECT_DIR/ai_service"
            source venv/bin/activate 2>/dev/null
            nohup python3 -m uvicorn main_light:app --host 0.0.0.0 --port $AI_SERVICE_PORT >> "$AI_SERVICE_LOG" 2>&1 &
            save_pid ai_service "$!"
            deactivate 2>/dev/null || true
            sleep 5
            if nc -z localhost $AI_SERVICE_PORT 2>/dev/null; then
                echo "[$(date)] AI Service RECOVERED ✓ (PID $!)" >> "$WATCHDOG_LOG"
                restarted="${restarted} AI"
            else
                echo "[$(date)] AI Service STILL DOWN ✗" >> "$WATCHDOG_LOG"
            fi
        fi

        # ── Frontend ──
        if ! nc -z localhost $FRONTEND_PORT 2>/dev/null; then
            echo "[$(date)] Frontend DOWN — restarting..." >> "$WATCHDOG_LOG"
            kill_port $FRONTEND_PORT
            cd "$PROJECT_DIR/government-dashboard"
            nohup npx vite --port $FRONTEND_PORT --host >> "$FRONTEND_LOG" 2>&1 &
            save_pid frontend "$!"
            sleep 5
            if nc -z localhost $FRONTEND_PORT 2>/dev/null; then
                echo "[$(date)] Frontend RECOVERED ✓ (PID $!)" >> "$WATCHDOG_LOG"
                restarted="${restarted} Frontend"
            else
                echo "[$(date)] Frontend STILL DOWN ✗" >> "$WATCHDOG_LOG"
            fi
        fi

        # Heartbeat every ~5 min
        if [ -z "$restarted" ]; then
            consecutive_ok=$((consecutive_ok + 1))
            if [ $((consecutive_ok % 30)) -eq 0 ]; then
                echo "[$(date)] ♥ All healthy (${consecutive_ok} checks OK)" >> "$WATCHDOG_LOG"
            fi
        else
            consecutive_ok=0
        fi
    done
) &

WATCHDOG_PID=$!
save_pid watchdog "$WATCHDOG_PID"
echo "$WATCHDOG_PID" > "$LOCK_FILE"

log "✓ Watchdog running (PID: $WATCHDOG_PID) — checks every ${WATCHDOG_INTERVAL}s"

# ═════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗"
echo -e "║             ALL SERVICES STARTED + WATCHDOG ACTIVE             ║"
echo -e "╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}📊 PostgreSQL${NC}        : localhost:5432"
echo -e "  ${GREEN}🖥️  Backend Server${NC}   : http://localhost:$BACKEND_PORT"
echo -e "  ${GREEN}🤖 AI Service${NC}        : http://localhost:$AI_SERVICE_PORT"
echo -e "  ${GREEN}🌐 Frontend Dashboard${NC}: http://localhost:$FRONTEND_PORT"
echo -e "  ${GREEN}🛡️  Watchdog Guardian${NC} : PID $WATCHDOG_PID (every ${WATCHDOG_INTERVAL}s)"
echo ""
echo -e "  ${YELLOW}Log Files:${NC}"
echo -e "    Backend  : $BACKEND_LOG"
echo -e "    AI       : $AI_SERVICE_LOG"
echo -e "    Frontend : $FRONTEND_LOG"
echo -e "    Watchdog : $WATCHDOG_LOG"
echo ""
echo -e "  ${YELLOW}Commands:${NC}"
echo -e "    Status    : ${CYAN}./status.sh${NC}"
echo -e "    Stop all  : ${CYAN}./stop_local.sh${NC}"
echo -e "    Watchdog  : ${CYAN}tail -f watchdog.log${NC}"
echo ""
echo -e "  ${BOLD}${GREEN}Open your browser → http://localhost:$FRONTEND_PORT${NC}"
echo ""
