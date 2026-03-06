#!/bin/sh
# Kali iOS Installer - DIELODIDE
# Builds an iSH importable Kali filesystem tarball integrating AOK Tools.
# Doing exact Alpine -> Debian/Kali swap like AOK install_debian.sh

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
    MSG_MENU_TITLE="TÉLÉCHARGEMENT ET CONFIGURATION SMART KALIOS (AOK Swap):"
    MSG_OPT_1="1) Installer KaliOS"
    MSG_OPT_2="2) Quitter l'installation"
    MSG_START="Démarrage de l'installation..."
    MSG_DEP="Installation des dépendances..."
    MSG_DOWN="TÉLÉCHARGEMENT DE L'IMAGE KALIOS (Google Drive)..."
    MSG_AOK="Téléchargement et configuration Alpine/AOK initiale..."
    MSG_EXTR="Extraction du Rootfs Kali..."
    MSG_SWAP="Remplacement d'Alpine par Kali (Processus AOK)..."
    MSG_BLD="Création de l'image finale..."
    MSG_FIN="Nettoyage des fichiers temporaires..."
    MSG_DONE="Installation Terminée!"
    MSG_PROMPT="Choix : "
else
    MSG_MENU_TITLE="SMART KALIOS DOWNLOAD AND SETUP (AOK Swap):"
    MSG_OPT_1="1) Install KaliOS"
    MSG_OPT_2="2) Quit installation"
    MSG_START="Starting Installation..."
    MSG_DEP="Installing Build Dependencies..."
    MSG_DOWN="DOWNLOADING KALIOS IMAGE (Google Drive)..."
    MSG_AOK="Downloading and setting up initial Alpine/AOK..."
    MSG_EXTR="Extracting Kali Rootfs..."
    MSG_SWAP="Swapping Alpine with Kali (AOK Process)..."
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
    printf "${C}    Kali iOS Installer (AOK Integrated Swap)${NC}\n"
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

BUILD_DIR="/tmp/aok_fs"
ROOTFS_TAR="/tmp/kali-rootfs.tar.gz"
ALPINE_TAR="/tmp/alpine-rootfs.tar.gz"
FINAL_TAR="kalios.tar.gz"
FILEID="1CxbJVbR4bhXKfP81bD_yQAzA_tdqmWXZ"

do_install() {
    echo ""
    printf "${G}${MSG_START}${NC}\n"

    printf "\n${G}${MSG_DEP}${NC}\n"
    apk update > /dev/null 2>&1
    (apk add --no-cache ncurses wget rsync tar coreutils curl git > /dev/null 2>&1) &
    spinner $!

    printf "\n${G}${MSG_AOK}${NC}\n"
    # 1. Download Alpine minirootfs to act as the base host
    wget -q -O "$ALPINE_TAR" "https://dl-cdn.alpinelinux.org/alpine/v3.18/releases/x86/alpine-minirootfs-3.18.4-x86.tar.gz"
    
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    tar -xf "$ALPINE_TAR" -C "$BUILD_DIR"
    
    # 2. Clone AOK Tools into the Alpine base
    rm -rf /tmp/termios-repo
    (git clone -b Aok --single-branch https://github.com/dielodide/termios.git /tmp/termios-repo > /dev/null 2>&1) &
    spinner $!
    
    mkdir -p "$BUILD_DIR"/opt
    cp -a /tmp/termios-repo/FilesystemToolsmain "$BUILD_DIR"/opt/AOK
    
    # Fake a deploy state so AOK scripts don't complain
    mkdir -p "$BUILD_DIR"/etc/opt/AOK
    echo "initializing" > "$BUILD_DIR"/etc/opt/AOK/deploy_state
    echo "3.18.4" > "$BUILD_DIR"/etc/alpine-release

    printf "\n${G}${MSG_DOWN}${NC}\n"
    URL="https://docs.google.com/uc?export=download&id=${FILEID}"
    curl -L -c /tmp/cookies.txt -s "$URL" > /tmp/out.html
    CONFIRM=$(grep -Eo 'confirm=[a-zA-Z0-9_-]+' /tmp/out.html | cut -d= -f2 | head -n 1)
    if [ -n "$CONFIRM" ]; then
        curl -L -b /tmp/cookies.txt --progress-bar -o "$ROOTFS_TAR" "https://docs.google.com/uc?export=download&confirm=${CONFIRM}&id=${FILEID}"
    else
        mv /tmp/out.html "$ROOTFS_TAR"
    fi
    rm -f /tmp/cookies.txt /tmp/out.html

    printf "\n${G}${MSG_EXTR}${NC}\n"
    distro_tmp_dir="$BUILD_DIR/Debian"
    mkdir -p "$distro_tmp_dir"
    
    (tar -xf "$ROOTFS_TAR" -C "$distro_tmp_dir" > /dev/null 2>&1) &
    spinner $!

    # Check for subdir mapping issue common with GDrive tars inside the extracted folder
    SUBDIR_COUNT=$(find "$distro_tmp_dir" -maxdepth 1 -type d | wc -l)
    if [ "$SUBDIR_COUNT" -eq 2 ]; then
        SUBDIR=$(find "$distro_tmp_dir" -maxdepth 1 -mindepth 1 -type d)
        if [ -d "$SUBDIR" ]; then
            mv "$SUBDIR"/* "$distro_tmp_dir"/
            mv "$SUBDIR"/.* "$distro_tmp_dir"/ 2>/dev/null || true
            rmdir "$SUBDIR"
        fi
    fi

    # Prepare missing apt config for first boot
    mkdir -p "$distro_tmp_dir/etc/apt/apt.conf.d"
    echo "Acquire::http::No-Cache true;" > "$distro_tmp_dir/etc/apt/apt.conf.d/99no-cache"
    echo "Acquire::http::Pipeline-Depth 0;" >> "$distro_tmp_dir/etc/apt/apt.conf.d/99no-cache"

    printf "\n${G}${MSG_SWAP}${NC}\n"
    # This block EXACTLY replicates install_debian.sh logic inside the build directory
    
    echo "-> Clearing openrc status"
    rm -rf "$distro_tmp_dir"/run/openrc
    
    echo "-> Maintaining resolv.conf and /etc/opt"
    cp -a "$BUILD_DIR"/etc/resolv.conf "$distro_tmp_dir"/etc/ 2>/dev/null || true
    cp -a "$BUILD_DIR"/etc/opt "$distro_tmp_dir"/etc/
    
    echo "-> Moving Debian /etc/profile into place"
    cp "$BUILD_DIR"/opt/AOK/Debian/etc/profile "$distro_tmp_dir"/etc/profile
    
    echo "-> Deleting most of Alpine FS"
    find "$BUILD_DIR"/lib/ -mindepth 1 -maxdepth 1 | grep -v musl | xargs rm -rf
    rm -rf "$BUILD_DIR"/home "$BUILD_DIR"/etc "$BUILD_DIR"/media "$BUILD_DIR"/mnt "$BUILD_DIR"/root "$BUILD_DIR"/run "$BUILD_DIR"/sbin "$BUILD_DIR"/srv "$BUILD_DIR"/usr "$BUILD_DIR"/var
    
    echo "-> Moving busybox to root"
    cp "$BUILD_DIR"/bin/busybox "$BUILD_DIR"/
    
    echo "-> Deleting last parts of Alpine"
    "$BUILD_DIR"/busybox rm -rf "$BUILD_DIR"/bin "$BUILD_DIR"/sbin
    
    echo "-> Putting Debian/Kali stuff into place"
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/bin "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/sbin "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/home "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/lib64 "$BUILD_DIR"/ 2>/dev/null || true
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/libx32 "$BUILD_DIR"/ 2>/dev/null || true
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/media "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/mnt "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/root "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/run "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/srv "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/usr "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/var "$BUILD_DIR"/
    "$BUILD_DIR"/busybox mv "$distro_tmp_dir"/etc "$BUILD_DIR"/
    
    echo "-> Copying Alpine lib (musl) to /usr/lib"
    "$BUILD_DIR"/busybox cp "$BUILD_DIR"/lib/* "$BUILD_DIR"/usr/lib/
    
    echo "-> Replacing /lib with a soft-link to /usr/lib"
    rm -rf "$BUILD_DIR"/lib
    ln -s usr/lib "$BUILD_DIR"/lib
    
    echo "-> Removing tmp area /Debian"
    rm -rf "$distro_tmp_dir"
    
    echo "-> Removing last traces of Alpine - busybox"
    rm -f "$BUILD_DIR"/busybox
    rm -f "$BUILD_DIR"/usr/lib/libc.musl*
    rm -f "$BUILD_DIR"/usr/lib/ld-musl*
    
    # Do exactly what initial_fs_prep_fam_deb() does in deb_utils.sh:
    echo "-> Setting up AOK inittab"
    cp -a "$BUILD_DIR"/opt/AOK/FamDeb/etc/inittab "$BUILD_DIR"/etc/inittab
    
    # INJECT APT FIX FOR FIRST BOOT SINCE IT IS KALI
    cat > "$BUILD_DIR"/root/first_boot_setup.sh << 'EOF'
#!/bin/sh
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive

echo "========================================"
echo " KaliOS AOK First Boot Configuration... "
echo "========================================"

groupadd -g 3000 _apt 2>/dev/null || true
useradd -u 3000 -g 3000 -s /usr/sbin/nologin -d /nonexistent _apt 2>/dev/null || true
chmod 777 /tmp /var/tmp
chmod +x /usr/lib/apt/methods/* 2>/dev/null || true

apt-get update -y || apt-get update -y --allow-insecure-repositories
apt-get install -y locales sudo dialog curl tzdata openrc cron dcron ncurses-term inetutils-ping bash rsync

echo "en_US.UTF-8 UTF-8" > /etc/locale.gen
locale-gen en_US.UTF-8
update-locale LANG=en_US.UTF-8

export USER_NAME="root"
export USER_SHELL="/bin/bash"

# RUN AOK SCRIPTS just like select_distro -> install_debian -> setup_debian
/bin/sh /opt/AOK/common_AOK/setup_common_env.sh
/bin/sh /opt/AOK/Debian/setup_debian.sh

# Remove hook
sed -i '/first_boot_setup.sh/d' /etc/profile
rm -f /root/first_boot_setup.sh

echo "========================================"
echo " Configuration Complete! Welcome to Kali "
echo "========================================"
echo "Please completely close and restart the iSH app now."
EOF
    chmod +x "$BUILD_DIR"/root/first_boot_setup.sh
    
    cat >> "$BUILD_DIR"/etc/profile << 'EOF'

if [ -f /root/first_boot_setup.sh ]; then
    /bin/sh /root/first_boot_setup.sh
fi
EOF

    printf "\n${G}${MSG_BLD}${NC}\n"
    cd "$BUILD_DIR"
    (tar -czf "/tmp/$FINAL_TAR" . > /dev/null 2>&1) &
    spinner $!
    
    cd /root
    mv "/tmp/$FINAL_TAR" "./$FINAL_TAR" 2>/dev/null || true

    printf "\n${G}${MSG_FIN}${NC}\n"
    rm -rf "$BUILD_DIR"
    rm -f "$ALPINE_TAR" "$ROOTFS_TAR"
    rm -rf /tmp/termios-repo
    
    printf "\n${G}${MSG_DONE}${NC}\n"

    if [ "$LANG_SEL" = "2" ]; then
        echo ""
        echo "═══════════════════════════════════════════"
        echo "COMMENT UTILISER KALI LINUX SUR iSH :"
        echo "═══════════════════════════════════════════"
        echo "1. Dans iSH, appuyez sur l'icône Paramètres ⚙️ (ou tapez 'pwd' pour voir où est le fichier)"
        echo "2. Allez dans Systèmes de fichiers -> Importer"
        echo "3. Sélectionnez le fichier '$FINAL_TAR' que vous venez de créer"
        echo "4. Attendez la fin de l'importation, puis sélectionnez-le comme système de fichiers par défaut"
        echo "5. FERMEZ ET REDÉMARREZ l'application iSH complètement."
        echo "6. Au premier démarrage, Kali se configurera automatiquement (prend ~2-3 mins)."
        echo "═══════════════════════════════════════════"
    else
        echo ""
        echo "═══════════════════════════════════════════"
        echo "HOW TO USE KALI LINUX ON iSH:"
        echo "═══════════════════════════════════════════"
        echo "1. In iSH, tap the Settings icon ⚙️ (or type 'pwd' to see where the file is)"
        echo "2. Go to Filesystems -> Import"
        echo "3. Select the '$FINAL_TAR' file you just created"
        echo "4. Wait for import to finish, then select it as the default filesystem"
        echo "5. CLOSE AND RESTART the iSH app completely."
        echo "6. On the first boot, Kali will configure itself automatically (takes ~2-3 mins)."
        echo "═══════════════════════════════════════════"
    fi
}

# Main execution
cd /root
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
