#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  Bibliothèque Ciberobs — Script de déploiement production
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ENV_FILE=".env.prod"
COMPOSE_FILE="docker-compose.prod.yml"

banner() {
    echo ""
    echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}${BOLD}║   Bibliothèque Ciberobs — Déploiement Prod  ║${NC}"
    echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
}

info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERREUR]${NC} $1"; }

ask() {
    local prompt="$1" default="$2" var_name="$3"
    if [[ -n "$default" ]]; then
        read -rp "$(echo -e "${BOLD}$prompt${NC} [${default}]: ")" value
        eval "$var_name=\"${value:-$default}\""
    else
        while true; do
            read -rp "$(echo -e "${BOLD}$prompt${NC}: ")" value
            if [[ -n "$value" ]]; then
                eval "$var_name=\"$value\""
                break
            fi
            error "Ce champ est obligatoire."
        done
    fi
}

ask_password() {
    local prompt="$1" var_name="$2"
    while true; do
        read -srp "$(echo -e "${BOLD}$prompt${NC}: ")" value
        echo ""
        if [[ ${#value} -ge 12 ]]; then
            eval "$var_name=\"$value\""
            break
        fi
        error "Le mot de passe doit contenir au moins 12 caractères."
    done
}

generate_secret() {
    openssl rand -base64 48 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(48))"
}

# ============================================================
#  Vérification des prérequis
# ============================================================
check_prerequisites() {
    info "Vérification des prérequis..."

    local missing=0

    for cmd in docker git openssl; do
        if ! command -v "$cmd" &>/dev/null; then
            error "$cmd n'est pas installé."
            missing=1
        fi
    done

    if ! docker compose version &>/dev/null && ! docker-compose version &>/dev/null; then
        error "Docker Compose n'est pas installé."
        missing=1
    fi

    if ! docker info &>/dev/null; then
        error "Le daemon Docker n'est pas démarré ou vous n'avez pas les permissions."
        missing=1
    fi

    if [[ $missing -eq 1 ]]; then
        echo ""
        error "Installez les dépendances manquantes et relancez le script."
        exit 1
    fi

    success "Tous les prérequis sont satisfaits."
}

# ============================================================
#  Configuration
# ============================================================
configure() {
    echo ""
    echo -e "${BOLD}── Configuration du serveur ──${NC}"
    echo ""

    ask "Nom de domaine ou IP du serveur" "" DOMAIN
    ask "Port HTTP" "80" HTTP_PORT

    echo ""
    echo -e "${BOLD}── Base de données PostgreSQL ──${NC}"
    echo ""

    ask "Nom de la base de données" "bibliotheque" POSTGRES_DB
    ask "Utilisateur PostgreSQL" "ciberobs" POSTGRES_USER
    ask_password "Mot de passe PostgreSQL (min 12 car.)" POSTGRES_PASSWORD

    echo ""
    echo -e "${BOLD}── Redis ──${NC}"
    echo ""

    ask_password "Mot de passe Redis (min 12 car.)" REDIS_PASSWORD

    echo ""
    echo -e "${BOLD}── Django ──${NC}"
    echo ""

    DJANGO_SECRET_KEY=$(generate_secret)
    success "Clé secrète Django générée automatiquement."

    ask "Créer un compte admin ? (o/n)" "o" CREATE_ADMIN
    if [[ "$CREATE_ADMIN" =~ ^[oOyY]$ ]]; then
        ask "Nom d'utilisateur admin" "admin" ADMIN_USERNAME
        ask "Email admin" "admin@${DOMAIN}" ADMIN_EMAIL
        ask_password "Mot de passe admin (min 12 car.)" ADMIN_PASSWORD
    fi

    # URLs
    if [[ "$HTTP_PORT" == "80" ]]; then
        BASE_URL="http://${DOMAIN}"
    else
        BASE_URL="http://${DOMAIN}:${HTTP_PORT}"
    fi

    NEXT_PUBLIC_API_URL="${BASE_URL}/api/v1"
    NEXT_PUBLIC_WS_URL="ws://${DOMAIN}:${HTTP_PORT}/ws"
    CORS_ORIGINS="${BASE_URL}"

    # Récapitulatif
    echo ""
    echo -e "${BOLD}── Récapitulatif ──${NC}"
    echo ""
    echo -e "  Domaine        : ${GREEN}${DOMAIN}${NC}"
    echo -e "  Port HTTP      : ${GREEN}${HTTP_PORT}${NC}"
    echo -e "  URL app        : ${GREEN}${BASE_URL}${NC}"
    echo -e "  URL API        : ${GREEN}${NEXT_PUBLIC_API_URL}${NC}"
    echo -e "  Base de données: ${GREEN}${POSTGRES_DB}${NC} (user: ${POSTGRES_USER})"
    echo ""

    read -rp "$(echo -e "${BOLD}Confirmer et lancer le déploiement ? (o/n)${NC}: ")" confirm
    if [[ ! "$confirm" =~ ^[oOyY]$ ]]; then
        warn "Déploiement annulé."
        exit 0
    fi
}

# ============================================================
#  Écriture du fichier .env.prod
# ============================================================
write_env() {
    info "Écriture de ${ENV_FILE}..."

    cat > "$ENV_FILE" <<EOF
# Généré par deploy.sh le $(date '+%Y-%m-%d %H:%M:%S')
# NE PAS COMMITTER CE FICHIER

# Serveur
DOMAIN=${DOMAIN}
HTTP_PORT=${HTTP_PORT}

# PostgreSQL
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}

# Django
DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}

# URLs
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
CORS_ORIGINS=${CORS_ORIGINS}
EOF

    chmod 600 "$ENV_FILE"
    success "${ENV_FILE} créé (permissions 600)."

    # S'assurer que .env.prod est dans .gitignore
    if [[ -f .gitignore ]]; then
        if ! grep -q "\.env\.prod" .gitignore; then
            echo ".env.prod" >> .gitignore
            success ".env.prod ajouté au .gitignore"
        fi
    fi
}

# ============================================================
#  Build & déploiement
# ============================================================
deploy() {
    echo ""
    info "Arrêt des conteneurs existants..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down 2>/dev/null || true

    echo ""
    info "Construction des images (cela peut prendre quelques minutes)..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

    echo ""
    info "Démarrage des services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    echo ""
    info "Attente du démarrage de la base de données..."
    local retries=0
    while ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db pg_isready -U "$POSTGRES_USER" &>/dev/null; do
        retries=$((retries + 1))
        if [[ $retries -ge 30 ]]; then
            error "La base de données n'a pas démarré à temps."
            exit 1
        fi
        sleep 2
    done
    success "Base de données prête."

    echo ""
    info "Attente du backend..."
    sleep 5

    # Création du superuser
    if [[ "${CREATE_ADMIN:-n}" =~ ^[oOyY]$ ]]; then
        info "Création du compte administrateur..."
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='${ADMIN_USERNAME}').exists():
    u = User.objects.create_superuser(
        username='${ADMIN_USERNAME}',
        email='${ADMIN_EMAIL}',
        password='${ADMIN_PASSWORD}',
    )
    u.role = 'admin'
    u.first_name = 'Admin'
    u.last_name = 'Ciberobs'
    u.save()
    print('Compte admin créé.')
else:
    print('Le compte admin existe déjà.')
" 2>/dev/null || warn "Impossible de créer le compte admin (le backend n'est peut-être pas prêt)."
    fi
}

# ============================================================
#  Vérification post-déploiement
# ============================================================
verify() {
    echo ""
    info "Vérification des services..."
    echo ""

    local all_ok=true

    for svc in db redis backend frontend nginx; do
        local state
        state=$(docker inspect --format='{{.State.Status}}' "ciberobs_${svc}" 2>/dev/null || echo "absent")
        if [[ "$state" == "running" ]]; then
            success "  ${svc}: en cours d'exécution"
        else
            error "  ${svc}: ${state}"
            all_ok=false
        fi
    done

    echo ""

    if $all_ok; then
        echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}${BOLD}║         Déploiement réussi !                ║${NC}"
        echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "  Application : ${BOLD}${BASE_URL}${NC}"
        echo -e "  API         : ${BOLD}${NEXT_PUBLIC_API_URL}${NC}"
        if [[ "${CREATE_ADMIN:-n}" =~ ^[oOyY]$ ]]; then
            echo -e "  Admin       : ${BOLD}${ADMIN_USERNAME}${NC}"
        fi
    else
        warn "Certains services ne sont pas en cours d'exécution."
        echo ""
        echo "  Consultez les logs avec :"
        echo "    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
    fi

    echo ""
    echo -e "${BOLD}Commandes utiles :${NC}"
    echo "  Logs       : docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
    echo "  Arrêter    : docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down"
    echo "  Redémarrer : docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart"
    echo "  Backup DB  : docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql"
    echo ""
}

# ============================================================
#  Main
# ============================================================
main() {
    banner
    check_prerequisites
    configure
    write_env
    deploy
    verify
}

main
