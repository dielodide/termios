#!/bin/sh
# Kali iOS Installer - DIELODIDE
# Automatically builds an importable Kali filesystem tarball for iSH.

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
    MSG_MENU_TITLE="TÉLÉCHARGEMENT ET CONFIGURATION SMART KALIOS:"
    MSG_OPT_1="1) Installer KaliOS"
    MSG_OPT_2="2) Quitter l'installation"
    MSG_START="Démarrage de l'installation..."
    MSG_DEP="Installation des dépendances..."
    MSG_DOWN="TÉLÉCHARGEMENT DE L'IMAGE KALIOS..."
    MSG_EXTR="Extraction du Rootfs..."
    MSG_CONF="Configuration de la compatibilité iSH..."
    MSG_BLD="Création de l'image finale..."
    MSG_FIN="Nettoyage des fichiers temporaires..."
    MSG_DONE="Installation Terminée!"
    MSG_PROMPT="Choix : "
else
    MSG_MENU_TITLE="SMART KALIOS DOWNLOAD AND SETUP:"
    MSG_OPT_1="1) Install KaliOS"
    MSG_OPT_2="2) Quit installation"
    MSG_START="Starting Installation..."
    MSG_DEP="Installing Build Dependencies..."
    MSG_DOWN="DOWNLOADING KALIOS IMAGE..."
    MSG_EXTR="Extracting Rootfs..."
    MSG_CONF="Configuring iSH Compatibility..."
    MSG_BLD="Building Final Filesystem Image..."
    MSG_FIN="Cleaning up temporary files..."
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

BUILD_DIR="/opt/kalios-build"
ROOTFS_URL="https://github.com/EXALAB/Anlinux-Resources/raw/master/Rootfs/Kali/i386/kali-rootfs-i386.tar.xz"
ROOTFS_TAR="kali-rootfs-i386.tar.xz"
FINAL_TAR="kalios.tar.gz"

do_install() {
    echo ""
    printf "${G}${MSG_START}${NC}\n"

    printf "\n${G}${MSG_DEP}${NC}\n"
    apk update > /dev/null 2>&1
    (apk add --no-cache ncurses wget rsync tar xz coreutils curl > /dev/null 2>&1) &
    spinner $!
    
    for pkg in ncurses wget rsync tar xz coreutils curl; do
        if [ "$LANG_SEL" = "2" ]; then
            printf "${G}✓ $pkg installé${NC}\n"
        else
            printf "${G}✓ $pkg installed${NC}\n"
        fi
    done

    printf "\n${G}${MSG_DOWN}${NC}\n"
    if [ "$LANG_SEL" = "2" ]; then
        echo "Source: AnLinux Kali i386 rootfs"
        echo "Taille: ~81-85 MB"
    else
        echo "Source: AnLinux Kali i386 rootfs"
        echo "Size: ~81-85 MB"
    fi
    wget -q --show-progress --continue -O "$ROOTFS_TAR" "$ROOTFS_URL"

    printf "\n${G}${MSG_EXTR}${NC}\n"
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    (tar -xJf "$ROOTFS_TAR" -C "$BUILD_DIR" > /dev/null 2>&1) &
    spinner $!

    printf "\n${G}${MSG_CONF}${NC}\n"
    mkdir -p "$BUILD_DIR/dev"
    mkdir -p "$BUILD_DIR/proc"
    mkdir -p "$BUILD_DIR/sys"
    mkdir -p "$BUILD_DIR/iCloud"
    if [ "$LANG_SEL" = "2" ]; then
        printf "${G}✓ Préparation des points de montage${NC}\n"
    else
        printf "${G}✓ Preparing mount points${NC}\n"
    fi

    cat > "$BUILD_DIR/root/first_boot_setup.sh" << 'EOF'
#!/bin/sh
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive

echo "========================================"
echo "  KaliOS First Boot Configuration... "
echo "========================================"

echo "nameserver 1.1.1.1" > /etc/resolv.conf
echo "nameserver 8.8.8.8" >> /etc/resolv.conf

# Add essential groups
for grp in storage wheel video audio tty input; do
    getent group $grp >/dev/null 2>&1 || groupadd -r $grp
done

apt-get update -y
apt-get install -y locales sudo dialog curl tzdata

echo "en_US.UTF-8 UTF-8" > /etc/locale.gen
locale-gen en_US.UTF-8
update-locale LANG=en_US.UTF-8

echo "========================================"
echo " Configuration Complete! Welcome to Kali "
echo "========================================"
rm -f /root/first_boot_setup.sh
EOF
    chmod +x "$BUILD_DIR/root/first_boot_setup.sh"
    
    if [ "$LANG_SEL" = "2" ]; then
        printf "${G}✓ Injection du script de premier démarrage${NC}\n"
    else
        printf "${G}✓ Injecting first-boot setup script${NC}\n"
    fi

    cat >> "$BUILD_DIR/etc/profile" << 'EOF'

if [ -f /root/first_boot_setup.sh ]; then
    /bin/sh /root/first_boot_setup.sh
fi
EOF

    if [ "$LANG_SEL" = "2" ]; then
        printf "${G}✓ Configuration des hooks /etc/profile${NC}\n"
    else
        printf "${G}✓ Configuring /etc/profile hooks${NC}\n"
    fi

    printf "\n${G}${MSG_BLD}${NC}\n"
    (cd "$BUILD_DIR" && tar -czf "/$FINAL_TAR" . > /dev/null 2>&1) &
    spinner $!
    mv "/$FINAL_TAR" "./$FINAL_TAR" 2>/dev/null || true
    
    if [ "$LANG_SEL" = "2" ]; then
        printf "${G}✓ Image compressée créée avec succès: $FINAL_TAR${NC}\n"
    else
        printf "${G}✓ Tarball created successfully: $FINAL_TAR${NC}\n"
    fi

    printf "\n${G}${MSG_FIN}${NC}\n"
    rm -rf "$BUILD_DIR"
    rm -f "$ROOTFS_TAR"
    
    printf "\n${G}${MSG_DONE}${NC}\n"

    if [ "$LANG_SEL" = "2" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "COMMENT UTILISER KALI LINUX SUR iSH :"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "1. Dans iSH, appuyez sur l'icône Paramètres ⚙️ (ou tapez 'pwd' pour voir où est le fichier)"
        echo "2. Allez dans Systèmes de fichiers -> Importer"
        echo "3. Sélectionnez le fichier '$FINAL_TAR' que vous venez de créer"
        echo "4. Attendez la fin de l'importation, puis sélectionnez-le comme système de fichiers par défaut"
        echo "5. FERMEZ ET REDÉMARREZ l'application iSH complètement."
        echo "6. Au premier démarrage, Kali se configurera automatiquement (prend ~2 mins)."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "HOW TO USE KALI LINUX ON iSH:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "1. In iSH, tap the Settings icon ⚙️ (or type 'pwd' to see where the file is)"
        echo "2. Go to Filesystems -> Import"
        echo "3. Select the '$FINAL_TAR' file you just created"
        echo "4. Wait for import to finish, then select it as the default filesystem"
        echo "5. CLOSE AND RESTART the iSH app completely."
        echo "6. On the first boot, Kali will configure itself automatically (takes ~2 mins)."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi
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
