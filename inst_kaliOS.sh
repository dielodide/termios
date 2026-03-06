#!/bin/sh
# Kali iOS Installer - DIELODIDE
# Properly integrates AOK framework to swap Alpine->Kali LIVE inside iSH
# Must be run from within Alpine iSH as root

# Colors
R='\033[1;31m'
Y='\033[1;33m'
G='\033[1;32m'
C='\033[1;36m'
B='\033[1;34m'
NC='\033[0m'

# Check root privileges
if [ "$(id -u)" -ne 0 ]; then
    printf "${R}Error: This script must be run as root.${NC}\n"
    printf "${R}Erreur: Ce script doit être exécuté en tant que root.${NC}\n"
    exit 1
fi

# Check we're running in iSH
if [ ! -d /proc/ish ]; then
    printf "${R}Error: This script must be run inside iSH app.${NC}\n"
    printf "${R}Erreur: Ce script doit être exécuté dans l'app iSH.${NC}\n"
    exit 1
fi

# Language selection
printf "${C}Select Language / Choisissez la langue:${NC}\n"
echo "1) English"
echo "2) Français"
printf "> "
read LANG_SEL

if [ "$LANG_SEL" = "2" ]; then
    MSG_MENU_TITLE="TÉLÉCHARGEMENT ET CONFIGURATION SMART KALIOS (AOK Swap):"
    MSG_OPT_1="1) Installer KaliOS"
    MSG_OPT_2="2) Quitter l'installation"
    MSG_START="Démarrage de l'installation..."
    MSG_DEP="Installation des dépendances..."
    MSG_AOK="Installation du framework AOK..."
    MSG_DOWN="TÉLÉCHARGEMENT DE L'IMAGE KALIOS (Google Drive)..."
    MSG_EXTR="Extraction du Rootfs Kali..."
    MSG_SWAP="Remplacement d'Alpine par Kali (Processus AOK)..."
    MSG_DONE="Installation Terminée!"
    MSG_PROMPT="Choix : "
else
    MSG_MENU_TITLE="SMART KALIOS DOWNLOAD AND SETUP (AOK Swap):"
    MSG_OPT_1="1) Install KaliOS"
    MSG_OPT_2="2) Quit installation"
    MSG_START="Starting Installation..."
    MSG_DEP="Installing Build Dependencies..."
    MSG_AOK="Installing AOK framework..."
    MSG_DOWN="DOWNLOADING KALIOS IMAGE (Google Drive)..."
    MSG_EXTR="Extracting Kali Rootfs..."
    MSG_SWAP="Swapping Alpine with Kali (AOK Process)..."
    MSG_DONE="Installation Complete!"
    MSG_PROMPT="Choice : "
fi

banner() {
    clear
    printf "${R}    ██╗  ██╗ █████╗ ██╗     ██╗${NC}\n"
    printf "${Y}    ██║ ██╔╝██╔══██╗██║     ██║${NC}\n"
    printf "${G}    █████╔╝ ███████║██║     ██║${NC}\n"
    printf "${C}    ██╔═██╗ ██╔══██║██║     ██║${NC}\n"
    printf "${B}    ██║  ██╗██║  ██║███████╗██║${NC}\n"
    printf "${B}    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝${NC}\n"
    echo " "
    printf "${C}    Kali iOS Installer (AOK Framework)${NC}\n"
    printf "${Y}    DIELODIDE${NC}\n"
    echo " "
    echo "-----------------------------------------------------"
}

spinner() {
    pid=$1
    delay=0.1
    spinstr='|/-\'
    while kill -0 $pid 2>/dev/null; do
        temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

KALI_DOWNLOAD_DIR="/tmp/kali_fs"
KALI_TARBALL="$KALI_DOWNLOAD_DIR/kali-rootfs.tar.gz"
KALI_TMP_DIR="/Kali"
FILEID="1CxbJVbR4bhXKfP81bD_yQAzA_tdqmWXZ"

do_install() {
    echo ""
    printf "${G}${MSG_START}${NC}\n"

    printf "\n${G}${MSG_DEP}${NC}\n"
    apk update > /dev/null 2>&1
    (apk add --no-cache ncurses wget rsync tar coreutils curl git > /dev/null 2>&1) &
    spinner $!
    
    if [ "$LANG_SEL" = "2" ]; then
        printf "${G}✓ Dépendances installées${NC}\n"
    else
        printf "${G}✓ Dependencies installed${NC}\n"
    fi

    printf "\n${G}${MSG_AOK}${NC}\n"
    
    # Clone AOK framework and install it properly
    rm -rf /tmp/termios-repo
    (git clone -b Aok --single-branch https://github.com/dielodide/termios.git /tmp/termios-repo > /dev/null 2>&1) &
    spinner $!
    
    # Install AOK into /opt/AOK
    rm -rf /opt/AOK
    mkdir -p /opt
    cp -a /tmp/termios-repo/FilesystemToolsmain /opt/AOK
    
    if [ "$LANG_SEL" = "2" ]; then
        printf "${G}✓ Framework AOK installé dans /opt/AOK${NC}\n"
    else
        printf "${G}✓ AOK Framework installed in /opt/AOK${NC}\n"
    fi
    
    # Source the critical utils.sh to get all AOK functions
    if [ -f /opt/AOK/tools/utils.sh ]; then
        . /opt/AOK/tools/utils.sh
        if [ "$LANG_SEL" = "2" ]; then
            printf "${G}✓ Fonctions AOK chargées${NC}\n"
        else
            printf "${G}✓ AOK functions loaded${NC}\n"
        fi
    else
        printf "${R}ERROR: /opt/AOK/tools/utils.sh not found!${NC}\n"
        exit 1
    fi
    
    # Source deb_utils for Debian family functions
    if [ -f /opt/AOK/FamDeb/deb_utils.sh ]; then
        . /opt/AOK/FamDeb/deb_utils.sh
        if [ "$LANG_SEL" = "2" ]; then
            printf "${G}✓ Utilitaires Debian chargés${NC}\n"
        else
            printf "${G}✓ Debian utilities loaded${NC}\n"
        fi
    else
        printf "${R}ERROR: /opt/AOK/FamDeb/deb_utils.sh not found!${NC}\n"
        exit 1
    fi

    printf "\n${G}${MSG_DOWN}${NC}\n"
    mkdir -p "$KALI_DOWNLOAD_DIR"
    
    URL="https://docs.google.com/uc?export=download&id=${FILEID}"
    curl -L -c /tmp/cookies.txt -s "$URL" > /tmp/out.html
    CONFIRM=$(grep -Eo 'confirm=[a-zA-Z0-9_-]+' /tmp/out.html | cut -d= -f2 | head -n 1)
    if [ -n "$CONFIRM" ]; then
        curl -L -b /tmp/cookies.txt --progress-bar -o "$KALI_TARBALL" "https://docs.google.com/uc?export=download&confirm=${CONFIRM}&id=${FILEID}"
    else
        mv /tmp/out.html "$KALI_TARBALL"
    fi
    rm -f /tmp/cookies.txt /tmp/out.html

    printf "\n${G}${MSG_EXTR}${NC}\n"
    
    # Use AOK's create_fs function to extract properly
    msg_1 "Extracting Kali (will show unpack time)"
    create_fs "$KALI_TARBALL" "$KALI_TMP_DIR"
    
    # Clear openrc status
    rm -rf "$KALI_TMP_DIR"/run/openrc
    msg_3 "Extracted Kali tarball"

    printf "\n${G}${MSG_SWAP}${NC}\n"
    
    cd / || error_msg "Failed to cd into: /"
    
    msg_3 "Maintaining resolv.conf"
    cp -a /etc/resolv.conf "$KALI_TMP_DIR"/etc/
    msg_3 "maintaining /etc/opt"
    cp -a /etc/opt "$KALI_TMP_DIR"/etc/
    
    # Use Debian profile as base (we'll customize for Kali after)
    msg_2 "Moving Debian/Kali /etc/profile into place"
    cp /opt/AOK/Debian/etc/profile "$KALI_TMP_DIR"/etc/profile
    
    rm -rf "$KALI_DOWNLOAD_DIR"
    
    # EXACT swap process from install_debian.sh
    msg_2 "Deleting most of Alpine FS"
    
    # Removing anything but musl from /lib
    find /lib/ -mindepth 1 -maxdepth 1 | grep -v musl | xargs rm -rf
    
    rm /home -rf
    rm /etc -rf
    rm /media -rf
    rm /mnt -rf
    rm /root -rf
    rm /run -rf
    rm /sbin -rf
    rm /srv -rf
    rm /usr -rf
    rm /var -rf
    
    msg_3 "Moving busybox to root"
    # will be deleted after Kali is in place
    cp /bin/busybox /
    
    msg_3 "Deleting last parts of Alpine"
    /busybox rm /bin -rf
    /busybox rm /sbin -rf
    
    msg_3 "Putting Kali stuff into place"
    /busybox mv "$KALI_TMP_DIR"/bin /
    /busybox mv "$KALI_TMP_DIR"/sbin /
    /busybox mv "$KALI_TMP_DIR"/home /
    /busybox mv "$KALI_TMP_DIR"/lib64 / 2>/dev/null || true
    /busybox mv "$KALI_TMP_DIR"/libx32 / 2>/dev/null || true
    /busybox mv "$KALI_TMP_DIR"/media /
    /busybox mv "$KALI_TMP_DIR"/mnt /
    /busybox mv "$KALI_TMP_DIR"/root /
    /busybox mv "$KALI_TMP_DIR"/run /
    /busybox mv "$KALI_TMP_DIR"/srv /
    /busybox mv "$KALI_TMP_DIR"/usr /
    /busybox mv "$KALI_TMP_DIR"/var /
    /busybox mv "$KALI_TMP_DIR"/etc /
    
    msg_3 "Copying Alpine lib (musl) to /usr/lib"
    /busybox cp /lib/* /usr/lib/
    
    msg_3 "Replacing /lib with a soft-link to /usr/lib"
    /opt/AOK/choose_distro/bin/lib_fix
    
    # From now on Kali should be fully available
    rm -f "$f_destfs_select_hint"
    
    msg_3 "Removing tmp area $KALI_TMP_DIR"
    rm "$KALI_TMP_DIR" -rf || error_msg "Failed to clear: $KALI_TMP_DIR"
    
    msg_2 "Removing last traces of Alpine - busybox"
    rm /busybox
    rm /usr/lib/libc.musl*
    rm /usr/lib/ld-musl*
    
    # Call initial_fs_prep_fam_deb which installs fix_dev and sets up inittab
    initial_fs_prep_fam_deb
    
    msg_2 "Set openrc to runlevel default"
    /usr/sbin/openrc default
    
    # Create custom Kali first boot script
    msg_2 "Setting up Kali first boot configuration"
    
    cat > /root/kali_first_boot.sh << 'EOF'
#!/bin/sh
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive

echo "========================================"
echo " KaliOS AOK First Boot Configuration... "
echo "========================================"

# Fix APT for Kali
echo "nameserver 1.1.1.1" > /etc/resolv.conf
echo "nameserver 8.8.8.8" >> /etc/resolv.conf

groupadd -g 3000 _apt 2>/dev/null || true
useradd -u 3000 -g 3000 -s /usr/sbin/nologin -d /nonexistent _apt 2>/dev/null || true
chmod 777 /tmp /var/tmp
mkdir -p /etc/apt/apt.conf.d
echo "Acquire::http::No-Cache true;" > /etc/apt/apt.conf.d/99no-cache
echo "Acquire::http::Pipeline-Depth 0;" >> /etc/apt/apt.conf.d/99no-cache
chmod +x /usr/lib/apt/methods/* 2>/dev/null || true

apt-get update -y || apt-get update -y --allow-insecure-repositories
apt-get install -y locales sudo dialog curl tzdata openrc cron dcron ncurses-term inetutils-ping bash rsync

echo "en_US.UTF-8 UTF-8" > /etc/locale.gen
locale-gen en_US.UTF-8
update-locale LANG=en_US.UTF-8

export USER_NAME="root"
export USER_SHELL="/bin/bash"

# Run AOK common setup
/bin/sh /opt/AOK/common_AOK/setup_common_env.sh
/bin/sh /opt/AOK/FamDeb/setup_famdeb.sh

# Cleanup this hook
sed -i '/kali_first_boot.sh/d' /etc/profile
rm -f /root/kali_first_boot.sh

echo "========================================"
echo " Configuration Complete! Welcome to Kali "
echo "========================================"
EOF
    
    chmod +x /root/kali_first_boot.sh
    
    # Hook it into profile
    echo "" >> /etc/profile
    echo "if [ -f /root/kali_first_boot.sh ]; then" >> /etc/profile
    echo "    /bin/sh /root/kali_first_boot.sh" >> /etc/profile
    echo "fi" >> /etc/profile
    
    printf "\n${G}${MSG_DONE}${NC}\n"

    if [ "$LANG_SEL" = "2" ]; then
        echo ""
        echo "══════════════════════════════════════════════════════════"
        echo "INSTALLATION TERMINÉE!"
        echo "══════════════════════════════════════════════════════════"
        echo "Kali Linux a été installé avec le framework AOK."
        echo ""
        echo "PROCHAINES ÉTAPES:"
        echo "1. FERMEZ COMPLÈTEMENT l'application iSH"
        echo "2. Redémarrez iSH"
        echo "3. Au premier démarrage, la configuration automatique prendra ~2-3 minutes"
        echo "4. Après, vous aurez Kali Linux opérationnel avec tous les outils AOK!"
        echo "══════════════════════════════════════════════════════════"
    else
        echo ""
        echo "══════════════════════════════════════════════════════════"
        echo "INSTALLATION COMPLETE!"
        echo "══════════════════════════════════════════════════════════"
        echo "Kali Linux has been installed with AOK framework."
        echo ""
        echo "NEXT STEPS:"
        echo "1. COMPLETELY CLOSE the iSH application"
        echo "2. Restart iSH"
        echo "3. On first boot, automatic configuration will take ~2-3 minutes"
        echo "4. After that, you'll have operational Kali Linux with all AOK tools!"
        echo "══════════════════════════════════════════════════════════"
    fi
}

# Main execution
cd /root
banner

# Menu
printf "${G}"
echo "$MSG_MENU_TITLE"
echo ""
echo "$MSG_OPT_1"
echo "$MSG_OPT_2"
echo ""
printf "$MSG_PROMPT"
read opt
printf "${NC}"

if [ "$opt" = "1" ]; then
    do_install
elif [ "$opt" = "2" ]; then
    exit 0
else
    echo "Invalid option / Option invalide"
    exit 1
fi
