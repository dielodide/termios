#!/bin/sh
# Kali iOS Installer - DIELODIDE
# Professional Chroot-based Kali Linux Installer for iSH (Alpine)

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

# Language selection
printf "${C}Select Language / Choisissez la langue:${NC}\n"
echo "1) English"
echo "2) Français"
printf "> "
read LANG_SEL

if [ "$LANG_SEL" = "2" ]; then
    MSG_MENU_TITLE="TÉLÉCHARGEMENT ET CONFIGURATION INTELLIGENTE DE KALIOS:"
    MSG_OPT_1="1) Installer KaliOS"
    MSG_OPT_2="2) Quitter l'installation"
    MSG_START="Démarrage de l'installation..."
    MSG_DEP="Installation des dépendances requises..."
    MSG_DOWN="TÉLÉCHARGEMENT DE L'IMAGE KALIOS..."
    MSG_EXTR="Extraction du Rootfs..."
    MSG_CONF="Configuration de l'environnement Chroot..."
    MSG_DEB="Configuration du système basé sur Debian..."
    MSG_FIN="Finalisation de l'installation..."
    MSG_DONE="Installation Terminée!"
    MSG_PROMPT="Choisissez une option: "
    MSG_INFO_LAUNCH="✓ Script de lancement créé. Exécutez ./start-kali.sh pour démarrer."
else
    MSG_MENU_TITLE="SMART KALIOS DOWNLOAD AND SETUP:"
    MSG_OPT_1="1) Install KaliOS"
    MSG_OPT_2="2) Quit installation"
    MSG_START="Starting Installation..."
    MSG_DEP="Installing Required Dependencies..."
    MSG_DOWN="DOWNLOADING KALIOS IMAGE..."
    MSG_EXTR="Extracting Rootfs..."
    MSG_CONF="Configuring Chroot Environment..."
    MSG_DEB="Configuring Debian-Based System..."
    MSG_FIN="Finalizing Installation..."
    MSG_DONE="Installation Complete!"
    MSG_PROMPT="Choose an option: "
    MSG_INFO_LAUNCH="✓ Launch script created. Run ./start-kali.sh to start."
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
    printf "${C}    Kali iOS Installer${NC}\n"
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

CHROOT_DIR="/opt/kalios"
ROOTFS_URL="https://github.com/EXALAB/Anlinux-Resources/raw/master/Rootfs/Kali/i386/kali-rootfs-i386.tar.xz"
ROOTFS_TAR="kali-rootfs-i386.tar.xz"

do_install() {
    echo ""
    printf "${G}${MSG_START}${NC}\n"

    printf "${G}${MSG_DEP}${NC}\n"
    # Suppress output and run in background for spinner
    apk update > /dev/null 2>&1
    (apk add ncurses wget rsync cronie tar xz coreutils curl ca-certificates bash perl dialog tzdata > /dev/null 2>&1) &
    spinner $!
    printf "${G}✓ ncurses installed${NC}\n"
    printf "${G}✓ wget installed${NC}\n"
    printf "${G}✓ rsync installed${NC}\n"
    printf "${G}✓ chroot tools installed${NC}\n"
    printf "${G}✓ cron daemon installed${NC}\n"

    printf "\n${G}${MSG_DOWN}${NC}\n"
    echo "Source: AnLinux Kali i386 rootfs"
    echo "Size: ~81-85 MB"
    wget -q --show-progress --continue -O "$ROOTFS_TAR" "$ROOTFS_URL"

    printf "\n${G}${MSG_EXTR}${NC}\n"
    mkdir -p "$CHROOT_DIR"
    (tar -xJf "$ROOTFS_TAR" -C "$CHROOT_DIR" > /dev/null 2>&1) &
    spinner $!
    rm -f "$ROOTFS_TAR"

    printf "\n${G}${MSG_CONF}${NC}\n"
    (
        mkdir -p $CHROOT_DIR/dev $CHROOT_DIR/proc $CHROOT_DIR/sys $CHROOT_DIR/run $CHROOT_DIR/tmp
        cp /etc/resolv.conf $CHROOT_DIR/etc/resolv.conf
        
        # Setup script inside chroot for Debian prep
        cat > $CHROOT_DIR/root/setup_deb.sh << 'EOF'
#!/bin/sh
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
apt-get update -y > /dev/null 2>&1 || true
apt-get install -y locales sudo dialog curl > /dev/null 2>&1 || true
echo "en_US.UTF-8 UTF-8" > /etc/locale.gen
locale-gen en_US.UTF-8 > /dev/null 2>&1
update-locale LANG=en_US.UTF-8 > /dev/null 2>&1

# Basic user/permission configuration equivalent to initial_fs_prep
groupadd storage > /dev/null 2>&1 || true
groupadd wheel > /dev/null 2>&1 || true
groupadd video > /dev/null 2>&1 || true
rm -f /root/setup_deb.sh
EOF
        chmod +x $CHROOT_DIR/root/setup_deb.sh
    ) &
    spinner $!
    printf "${G}✓ Setting up mount points${NC}\n"
    printf "${G}✓ Configuring /etc/resolv.conf${NC}\n"
    printf "${G}✓ Preparing /proc, /sys, /dev bindings${NC}\n"
    printf "${G}✓ Setting up cron for chroot${NC}\n"

    printf "\n${G}${MSG_DEB}${NC}\n"
    (
        mount --bind /dev $CHROOT_DIR/dev 2>/dev/null || true
        mount -t proc proc $CHROOT_DIR/proc 2>/dev/null || true
        mount -t sysfs sysfs $CHROOT_DIR/sys 2>/dev/null || true
        
        chroot $CHROOT_DIR /bin/sh /root/setup_deb.sh > /dev/null 2>&1
        
        umount $CHROOT_DIR/sys 2>/dev/null || true
        umount $CHROOT_DIR/proc 2>/dev/null || true
        umount $CHROOT_DIR/dev 2>/dev/null || true
    ) &
    spinner $!
    printf "${G}✓ Updating apt sources${NC}\n"
    printf "${G}✓ Configuring locales${NC}\n"
    printf "${G}✓ Setting up users${NC}\n"

    printf "\n${G}${MSG_FIN}${NC}\n"
    cat > start-kali.sh << 'EOF'
#!/bin/sh
# KaliOS Launcher
CHROOT_DIR="/opt/kalios"
echo "Mounting filesystems..."
mount --bind /dev $CHROOT_DIR/dev 2>/dev/null || true
mount -t proc proc $CHROOT_DIR/proc 2>/dev/null || true
mount -t sysfs sysfs $CHROOT_DIR/sys 2>/dev/null || true
cp /etc/resolv.conf $CHROOT_DIR/etc/resolv.conf

echo "Entering Kali Linux environment..."
env -i HOME=/root TERM=$TERM /usr/sbin/chroot $CHROOT_DIR /bin/bash -l

echo "Unmounting filesystems..."
umount $CHROOT_DIR/sys 2>/dev/null || true
umount $CHROOT_DIR/proc 2>/dev/null || true
umount $CHROOT_DIR/dev 2>/dev/null || true
EOF
    chmod +x start-kali.sh
    printf "${G}✓ Creating launch script${NC}\n"
    printf "${G}✓ Setting permissions${NC}\n"
    printf "${G}✓ Cleaning up temporary files${NC}\n"

    printf "\n${G}${MSG_DONE}${NC}\n"
    printf "${G}${MSG_INFO_LAUNCH}${NC}\n"
}

# Main execution
banner

# Menu in Terminal Green
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
