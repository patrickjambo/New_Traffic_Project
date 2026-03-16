#!/bin/bash
# =============================================================================
# TrafficGuard - Stop All Local Services (including Watchdog)
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$PROJECT_DIR/.pids"
LOCK_FILE="$PID_DIR/start.lock"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          TrafficGuard - Stopping All Services                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Kill the Watchdog FIRST (so it doesn't restart what we kill) ──
echo -e "${YELLOW}[1/4] Stopping Watchdog Guardian...${NC}"
if [ -f "$PID_DIR/watchdog.pid" ]; then
    WD_PID=$(cat "$PID_DIR/watchdog.pid" 2>/dev/null)
    if kill -0 "$WD_PID" 2>/dev/null; then
        kill "$WD_PID" 2>/dev/null
        sleep 1
        kill -9 "$WD_PID" 2>/dev/null || true
        echo -e "  ${GREEN}✓ Watchdog stopped (PID: $WD_PID)${NC}"
    else
        echo -e "  ${YELLOW}Watchdog already stopped${NC}"
    fi
    rm -f "$PID_DIR/watchdog.pid"
fi
rm -f "$LOCK_FILE"

# ── 2. Stop services by PID file ──
echo -e "${YELLOW}[2/4] Stopping services by PID...${NC}"
for svc in frontend ai_service backend; do
    pid_file="$PID_DIR/${svc}.pid"
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file" 2>/dev/null)
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "  Stopping $svc (PID: $pid)..."
            kill "$pid" 2>/dev/null
            sleep 1
            kill -9 "$pid" 2>/dev/null || true
            echo -e "  ${GREEN}✓ $svc stopped${NC}"
        else
            echo -e "  ${YELLOW}$svc already stopped${NC}"
        fi
        rm -f "$pid_file"
    fi
done

# ── 3. Kill by port (safety net) ──
echo -e "${YELLOW}[3/4] Cleaning up ports...${NC}"
for port_info in "5176:Frontend" "8000:AI Service" "3000:Backend"; do
    port="${port_info%%:*}"
    name="${port_info##*:}"
    pids=$(lsof -t -i:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
        echo -e "  ${GREEN}✓ Killed $name on port $port${NC}"
    fi
done

# ── 4. Kill any remaining project processes ──
echo -e "${YELLOW}[4/4] Killing stray processes...${NC}"
pkill -f "government-dashboard.*vite" 2>/dev/null || true
pkill -f "uvicorn main_light" 2>/dev/null || true
pkill -f "node src/server.js" 2>/dev/null || true

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗"
echo -e "║           All Services Stopped Successfully                    ║"
echo -e "╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}Note: PostgreSQL is still running (system service)${NC}"
echo -e "  ${YELLOW}To stop PostgreSQL: sudo systemctl stop postgresql${NC}"
echo ""
