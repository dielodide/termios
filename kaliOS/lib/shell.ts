import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CommandOutput {
  output: string;
  isError: boolean;
  newDir?: string;
}

interface VirtualFS {
  [path: string]: { name: string; type: 'file' | 'directory'; content?: string }[];
}

// Built-in commands that work without rootfs
const BUILTIN_COMMANDS: { [key: string]: (args: string[], currentDir: string) => Promise<CommandOutput> } = {
  help: async () => ({
    output: `
Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Navigation:
    cd <dir>        Change directory
    pwd             Print working directory
    ls [dir]        List directory contents

  File Operations:
    cat <file>      Display file contents
    touch <file>    Create empty file
    mkdir <dir>     Create directory
    rm <file>       Remove file
    cp <src> <dst>  Copy file
    mv <src> <dst>  Move file

  Text Processing:
    echo <text>     Display text
    grep <pattern>  Search for pattern

  System:
    whoami          Display current user
    hostname        Display hostname
    uname [-a]      System information
    date            Display date/time
    uptime          System uptime
    clear           Clear terminal

  Network (simulated):
    ping <host>     Ping host
    ifconfig        Network interfaces
    netstat         Network statistics

  Security Tools (simulated):
    nmap <target>   Port scanner
    nikto <target>  Web scanner
    sqlmap          SQL injection tool
    hydra           Password cracker
    john            John the Ripper
    aircrack-ng     WiFi cracker
    metasploit      Exploitation framework
    burpsuite       Web proxy

  Package Management:
    apt update      Update package list
    apt install     Install package
    apt search      Search packages

  Other:
    setup           Configure Kali rootfs
    history         Command history
    exit            Exit terminal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
    isError: false,
  }),

  pwd: async (args, currentDir) => ({
    output: currentDir === '~' ? '/home/kali' : currentDir,
    isError: false,
  }),

  cd: async (args, currentDir) => {
    const target = args[0] || '~';
    let newDir = currentDir;

    if (target === '~' || target === '') {
      newDir = '~';
    } else if (target === '..') {
      if (currentDir !== '/' && currentDir !== '~') {
        const parts = currentDir.split('/');
        parts.pop();
        newDir = parts.join('/') || '/';
      }
    } else if (target === '/') {
      newDir = '/';
    } else if (target.startsWith('/')) {
      newDir = target;
    } else {
      newDir = currentDir === '/' ? `/${target}` : `${currentDir}/${target}`;
    }

    return { output: '', isError: false, newDir };
  },

  ls: async (args, currentDir) => {
    const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
    const longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al');

    // Simulated file system
    const fsContent: { [key: string]: string[] } = {
      '~': ['Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Videos', '.bashrc', '.zshrc', '.config'],
      '/': ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'media', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'srv', 'sys', 'tmp', 'usr', 'var'],
      '/home': ['kali'],
      '/home/kali': ['Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Videos'],
      '/etc': ['passwd', 'shadow', 'hosts', 'resolv.conf', 'fstab', 'hostname'],
      '/usr': ['bin', 'include', 'lib', 'local', 'sbin', 'share'],
      '/usr/bin': ['bash', 'cat', 'chmod', 'cp', 'curl', 'cut', 'date', 'df', 'echo', 'grep', 'ls', 'mkdir', 'mv', 'nmap', 'python3', 'rm', 'ssh', 'tar', 'wget', 'zsh'],
    };

    const dir = currentDir === '~' ? '~' : currentDir;
    const files = fsContent[dir] || ['(empty)'];

    let output = '';
    if (longFormat) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      files.forEach(f => {
        const isDir = !f.includes('.');
        const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
        const size = isDir ? '4096' : Math.floor(Math.random() * 10000).toString().padStart(5);
        const color = isDir ? '\x1b[34m' : (f.startsWith('.') ? '\x1b[90m' : '');
        output += `${perms}  1 kali kali ${size} ${dateStr} ${color}${f}\x1b[0m\n`;
      });
    } else {
      const colored = files.map(f => {
        if (!f.includes('.') && !f.startsWith('.')) return `\x1b[34m${f}\x1b[0m`;
        if (f.startsWith('.')) return `\x1b[90m${f}\x1b[0m`;
        return f;
      });
      output = colored.join('  ');
    }

    return { output, isError: false };
  },

  cat: async (args) => {
    if (!args[0]) {
      return { output: 'cat: missing operand', isError: true };
    }

    const fileContents: { [key: string]: string } = {
      '.bashrc': '# ~/.bashrc: executed by bash\nexport PS1="\\[\\033[01;32m\\]┌──(\\u㉿\\h)-[\\w]\\n└─\\$\\[\\033[00m\\] "\nexport PATH=$PATH:/usr/local/bin\nalias ll="ls -la"\nalias la="ls -A"',
      '.zshrc': '# Kali Linux zshrc\nexport ZSH="$HOME/.oh-my-zsh"\nZSH_THEME="kali"\nplugins=(git sudo)\nsource $ZSH/oh-my-zsh.sh',
      '/etc/passwd': 'root:x:0:0:root:/root:/bin/bash\nkali:x:1000:1000:Kali,,,:/home/kali:/bin/zsh',
      '/etc/hosts': '127.0.0.1\tlocalhost\n127.0.1.1\tkali\n::1\t\tlocalhost ip6-localhost ip6-loopback',
      '/etc/hostname': 'kali',
    };

    const content = fileContents[args[0]];
    if (content) {
      return { output: content, isError: false };
    }
    return { output: `cat: ${args[0]}: No such file or directory`, isError: true };
  },

  echo: async (args) => ({
    output: args.join(' ').replace(/\$USER/g, 'kali').replace(/\$HOME/g, '/home/kali'),
    isError: false,
  }),

  whoami: async () => ({ output: 'kali', isError: false }),

  hostname: async () => ({ output: 'termios-kali', isError: false }),

  uname: async (args) => {
    if (args.includes('-a')) {
      return {
        output: 'Linux termios-kali 6.1.0-kali9-arm64 #1 SMP Kali 6.1.27-1kali1 aarch64 GNU/Linux',
        isError: false,
      };
    }
    return { output: 'Linux', isError: false };
  },

  date: async () => ({
    output: new Date().toString(),
    isError: false,
  }),

  uptime: async () => {
    const hours = Math.floor(Math.random() * 24);
    const mins = Math.floor(Math.random() * 60);
    return {
      output: ` ${new Date().toLocaleTimeString()} up ${hours}:${mins.toString().padStart(2, '0')}, 1 user, load average: 0.52, 0.58, 0.59`,
      isError: false,
    };
  },

  clear: async () => ({ output: '\x1b[2J\x1b[H', isError: false }),

  touch: async (args) => {
    if (!args[0]) {
      return { output: 'touch: missing file operand', isError: true };
    }
    return { output: '', isError: false };
  },

  mkdir: async (args) => {
    if (!args[0]) {
      return { output: 'mkdir: missing operand', isError: true };
    }
    return { output: '', isError: false };
  },

  rm: async (args) => {
    if (!args[0]) {
      return { output: 'rm: missing operand', isError: true };
    }
    return { output: '', isError: false };
  },

  // Network commands (simulated)
  ping: async (args) => {
    if (!args[0]) {
      return { output: 'ping: missing host operand', isError: true };
    }
    const host = args[0];
    let output = `PING ${host} (93.184.216.34) 56(84) bytes of data.\n`;
    for (let i = 1; i <= 4; i++) {
      const time = (Math.random() * 50 + 10).toFixed(1);
      output += `64 bytes from ${host}: icmp_seq=${i} ttl=56 time=${time} ms\n`;
    }
    output += `\n--- ${host} ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss`;
    return { output, isError: false };
  },

  ifconfig: async () => ({
    output: `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.100  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::a00:27ff:fe8e:8aa8  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:8e:8a:a8  txqueuelen 1000  (Ethernet)
        RX packets 1024  bytes 98765 (96.4 KiB)
        TX packets 512  bytes 54321 (53.0 KiB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)`,
    isError: false,
  }),

  netstat: async () => ({
    output: `Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:5432          0.0.0.0:*               LISTEN
tcp        0      0 192.168.1.100:22        192.168.1.1:52341       ESTABLISHED`,
    isError: false,
  }),

  // Security tools (simulated)
  nmap: async (args) => {
    if (!args[0]) {
      return { output: 'Nmap 7.94 ( https://nmap.org )\nUsage: nmap [Scan Type] [Options] {target}', isError: false };
    }
    return {
      output: `Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for ${args[0]}
Host is up (0.015s latency).

PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
443/tcp  open  https
3306/tcp open  mysql

Nmap done: 1 IP address (1 host up) scanned in 2.35 seconds`,
      isError: false,
    };
  },

  nikto: async (args) => {
    if (!args[0]) {
      return { output: 'nikto: missing target (-h <host>)', isError: true };
    }
    return {
      output: `- Nikto v2.5.0
---------------------------------------------------------------------------
+ Target IP:          ${args[0]}
+ Target Hostname:    ${args[0]}
+ Target Port:        80
+ Start Time:         ${new Date().toISOString()}
---------------------------------------------------------------------------
+ Server: Apache/2.4.52
+ /: The anti-clickjacking X-Frame-Options header is not present.
+ /: Cookie PHPSESSID created without the httponly flag.
+ /admin/: Directory indexing found.
+ /backup/: Backup directory found.
+ 7890 requests: 0 error(s) and 4 item(s) reported`,
      isError: false,
    };
  },

  sqlmap: async () => ({
    output: `        ___
       __H__
 ___ ___[,]_____ ___ ___  {1.7.2#stable}
|_ -| . [']     | .'| . |
|___|_  [)]_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org

Usage: python3 sqlmap.py [options]

Options:
  -h, --help            Show basic help message and exit
  -u URL, --url=URL     Target URL (e.g. "http://www.site.com/vuln.php?id=1")
  --dbs                 Enumerate DBMS databases
  --tables              Enumerate DBMS database tables`,
    isError: false,
  }),

  hydra: async () => ({
    output: `Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak

Syntax: hydra [[[-l LOGIN|-L FILE] [-p PASS|-P FILE]] | [-C FILE]] [-e nsr]
        [-o FILE] [-t TASKS] [-M FILE [-T TASKS]] [-w TIME] [-W TIME] [-f]
        [-s PORT] [-x MIN:MAX:CHARSET] [-c TIME] [-ISOuvVd46] [-m MODULE_OPT]
        [service://server[:PORT][/OPT]]

Examples:
  hydra -l user -P passlist.txt ftp://192.168.0.1
  hydra -L userlist.txt -p defaultpw imap://192.168.0.1/PLAIN`,
    isError: false,
  }),

  john: async () => ({
    output: `John the Ripper 1.9.0-jumbo-1+bleeding
Copyright (c) 1996-2023 by Solar Designer and others

Usage: john [OPTIONS] [PASSWORD-FILES]
--single[=SECTION]        "single crack" mode
--wordlist[=FILE]         wordlist mode, read words from FILE
--rules[=SECTION]         enable word mangling rules for wordlist mode
--incremental[=MODE]      "incremental" mode`,
    isError: false,
  }),

  'aircrack-ng': async () => ({
    output: `Aircrack-ng 1.7  - (C) 2006-2023 Thomas d'Otreppe
  https://www.aircrack-ng.org

  Usage: aircrack-ng [options] <input file(s)>

  Options:
    -a <amode>  : force attack mode (1/WEP, 2/WPA-PSK)
    -e <essid>  : target selection: network identifier
    -b <bssid>  : target selection: access point's MAC
    -w <words>  : path to wordlist(s) filename(s)`,
    isError: false,
  }),

  metasploit: async () => ({
    output: `
      =[ metasploit v6.3.27-dev                          ]
+ -- --=[ 2341 exploits - 1220 auxiliary - 413 post       ]
+ -- --=[ 1390 payloads - 46 encoders - 11 nops           ]
+ -- --=[ 9 evasion                                       ]

msf6 > `,
    isError: false,
  }),

  burpsuite: async () => ({
    output: `Burp Suite Community Edition v2023.10.3
Starting Burp Suite...
[*] Proxy listener started on 127.0.0.1:8080
[*] Ready to intercept traffic`,
    isError: false,
  }),

  // Package management
  apt: async (args) => {
    const subcommand = args[0];
    switch (subcommand) {
      case 'update':
        return {
          output: `Hit:1 http://kali.download/kali kali-rolling InRelease
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
All packages are up to date.`,
          isError: false,
        };
      case 'install':
        if (!args[1]) {
          return { output: 'E: No packages specified', isError: true };
        }
        return {
          output: `Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  ${args[1]}
0 upgraded, 1 newly installed, 0 to remove.
Need to get 1,234 kB of archives.
Get:1 http://kali.download/kali kali-rolling/main arm64 ${args[1]} [1,234 kB]
Fetched 1,234 kB in 1s (1,234 kB/s)
Setting up ${args[1]} ...
Processing triggers for man-db ...`,
          isError: false,
        };
      case 'search':
        return {
          output: `Sorting... Done
Full Text Search... Done
nmap/kali-rolling 7.94+git20230807.3be01efb1-0kali1 arm64
  The Network Mapper

nikto/kali-rolling 1:2.5.0-1 all
  web server security scanner`,
          isError: false,
        };
      default:
        return {
          output: 'apt: usage: apt [update|install|search|remove|upgrade]',
          isError: false,
        };
    }
  },

  history: async () => {
    try {
      const history = await AsyncStorage.getItem('command_history');
      if (history) {
        const commands = JSON.parse(history);
        return {
          output: commands.slice(0, 20).map((cmd: string, i: number) => `  ${i + 1}  ${cmd}`).join('\n'),
          isError: false,
        };
      }
    } catch (e) {
      // ignore
    }
    return { output: '(no history)', isError: false };
  },

  setup: async () => ({
    output: 'Navigate to Setup screen to configure Kali rootfs',
    isError: false,
  }),

  exit: async () => ({
    output: 'Use the back button to exit the terminal',
    isError: false,
  }),

  grep: async (args) => {
    if (args.length < 1) {
      return { output: 'grep: missing pattern', isError: true };
    }
    return {
      output: `grep: (simulated) would search for "${args[0]}" in ${args[1] || 'stdin'}`,
      isError: false,
    };
  },

  python3: async (args) => {
    if (args.length === 0) {
      return {
        output: `Python 3.11.4 (main, Jun  9 2023, 07:30:55) [GCC 12.2.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> (interactive mode not supported)`,
        isError: false,
      };
    }
    return { output: `python3: can't open file '${args[0]}': [Errno 2] No such file or directory`, isError: true };
  },

  id: async () => ({
    output: 'uid=1000(kali) gid=1000(kali) groups=1000(kali),4(adm),20(dialout),24(cdrom),25(floppy),27(sudo),29(audio),30(dip),44(video),46(plugdev),100(users),101(netdev)',
    isError: false,
  }),

  df: async () => ({
    output: `Filesystem     1K-blocks    Used Available Use% Mounted on
/dev/sda1       51475068 8234512  40606508  17% /
tmpfs            1019392       0   1019392   0% /dev/shm
tmpfs             407760    1152    406608   1% /run`,
    isError: false,
  }),

  free: async () => ({
    output: `               total        used        free      shared  buff/cache   available
Mem:         2038784      524288     1024000       65536      490496     1514496
Swap:        1048576           0     1048576`,
    isError: false,
  }),

  top: async () => ({
    output: `top - ${new Date().toLocaleTimeString()} up 2:34, 1 user, load average: 0.52, 0.58, 0.59
Tasks: 128 total,   1 running, 127 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.3 us,  1.2 sy,  0.0 ni, 96.2 id,  0.3 wa,  0.0 hi,  0.0 si
MiB Mem :   1990.2 total,   1000.0 free,    512.0 used,    478.2 buff/cache
MiB Swap:   1024.0 total,   1024.0 free,      0.0 used.   1480.0 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
    1 root      20   0  167512  11392   8320 S   0.0   0.6   0:02.34 systemd
  245 root      20   0   21532   5632   4864 S   0.0   0.3   0:00.12 sshd`,
    isError: false,
  }),

  ps: async (args) => {
    if (args.includes('aux') || args.includes('-aux')) {
      return {
        output: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.6 167512 11392 ?        Ss   10:00   0:02 /sbin/init
root       245  0.0  0.3  21532  5632 ?        Ss   10:00   0:00 sshd
kali      1234  0.0  0.2  10240  4096 pts/0    Ss   10:05   0:00 -zsh
kali      5678  0.0  0.1   8192  2048 pts/0    R+   10:10   0:00 ps aux`,
        isError: false,
      };
    }
    return {
      output: `  PID TTY          TIME CMD
 1234 pts/0    00:00:00 zsh
 5678 pts/0    00:00:00 ps`,
      isError: false,
    };
  },

  which: async (args) => {
    if (!args[0]) {
      return { output: 'which: missing argument', isError: true };
    }
    const commands = ['bash', 'zsh', 'ls', 'cat', 'grep', 'nmap', 'python3', 'curl', 'wget'];
    if (commands.includes(args[0])) {
      return { output: `/usr/bin/${args[0]}`, isError: false };
    }
    return { output: `${args[0]} not found`, isError: true };
  },

  man: async (args) => {
    if (!args[0]) {
      return { output: 'What manual page do you want?', isError: false };
    }
    return {
      output: `${args[0].toUpperCase()}(1)                   User Commands                   ${args[0].toUpperCase()}(1)

NAME
       ${args[0]} - (manual page not available in this environment)

SYNOPSIS
       ${args[0]} [OPTIONS]...

DESCRIPTION
       Run 'help' for available commands in TermiOS.`,
      isError: false,
    };
  },
};

export async function executeCommand(input: string, currentDir: string): Promise<CommandOutput> {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { output: '', isError: false };
  }

  // Parse command and arguments
  const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const command = parts[0]?.toLowerCase();
  const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ''));

  // Check for built-in command
  const builtin = BUILTIN_COMMANDS[command];
  if (builtin) {
    return await builtin(args, currentDir);
  }

  // Check for common aliases
  if (command === 'll') {
    return await BUILTIN_COMMANDS.ls(['-la'], currentDir);
  }
  if (command === 'la') {
    return await BUILTIN_COMMANDS.ls(['-a'], currentDir);
  }

  // Unknown command
  return {
    output: `Command not found: ${command}\nType 'help' for available commands.`,
    isError: true,
  };
}
