# **6IX - ATM10 Bot**

## **Tech Stack**

Node.js  
Discord.js v14  
rcon-client  
ssh2-sftp-client  
sqlite3  
Dotenv

## **Project Structure**

6ix-atm10-bot/  
│  
├── bot.js  
├── package.json  
├── README.md
├── .gitignore    
├── .env  
│  
├── modules/  
│   ├── rcon.js  
│   ├── sftp.js	<-- Features byte-offset file stream seeking   
│   ├── database.js		<-- Automatically handles initialization   
│   ├── playtime.js  
│   ├── embedBuilder.js   
│   ├──  config.js  
│   ├── scheduler.js   
│   ├── playerCache.js   
│   ├── logParser.js 	<-- Extracts Usernames, UUIDs & handles incremental log lines & strictly processes new incremental log lines   
│   ├── permissions.js  
│   ├── chatBridge.js  
│   ├── serverMonitor.js  
│   └── commandLogger.js  
│  
├── commands/  
│   ├── online.js  
│   ├── tps.js  
│   ├── playtime.js  
│   ├── server.js  
│   ├── console.js  
│   ├── ban.js  
│   ├── kick.js  
│   ├── restart.js  
│   └── stop.js  
│  
├── database/  
│   └── data.sqlite  
│  
└── cache/  
│  └── logState.json <-- Tracks last read byte position, timestamp, & triggers reset to 0 upon rotation   
│  
└── logs/  
     └── command-log.txt 

## **Database**

players  
├─ username  
├─ uuid  
├─ first_join  
├─ last_seen  
├─ total_playtime  
├─ sessions  
├─ deaths 
└─ advancements

##  **Auto Commands Visual**

**Everything goes into:**

#🤖bot-commands  
#admins-chat

**Including:**

1. Joins  
     
   🟢 user joined the server

2. 🔴 Leaves  
     
   👋 user left the server  
   ⏱ Session: 2h 17m 44s

3. Deaths  
     
   💀 user was slain by Zombie  
     
4. Advancements  
     
   🏆 user has made the advancement:  
   *Allthemodium Smithing*  
     
5. Chat (Minecraft -> Discord & Discord -> Minecraft)  
     
   MC -> Discord  
   ⛏️ <user> hello everyone  
   Discord -> MC   
    [Discord] <user> hello everyone

6. Status Alerts  
     
   🔄 Server Restart Detected  
     
   🛑 Server Stopped  
     
   ✅ Server Online

7. Command Logs (Admin Chat)

   🖥️ [user] Executed:

   

   /kick QauiltyControl

   

   ⌚ Time Stamp: 8:41 PM

## **Slash Commands** 

/online [online player list]
/tps [30s cooldown & categorized condition]   
/playtime <user> [how long this user has been playing]  
/server [displays server details]   
/rcon <console command> [executes console commands]  
/ban <user> [bans player]  
/kick <user> [kicks player]  
/restart [restarts server]  
/stop [stops server]

## **Slash Commands Visual**

1. /online  
     
—--------------------------------------------------------------  
                     **PLAYER COUNT: 4️⃣**  
—--------------------------------------------------------------
                       QauiltyControl  
                          S_aucyyy  
                         2xWockyyy  
                       PikaPikaPikaaa  
—--------------------------------------------------------------  
or  
—--------------------------------------------------------------  
                       **PLAYER COUNT: 0️⃣**  
—--------------------------------------------------------------  
                          No Users Online  
—--------------------------------------------------------------  
or  
—--------------------------------------------------------------  
                         **Server Offline**  
—--------------------------------------------------------------  
                            Offline
—--------------------------------------------------------------

2. /tps  
     
   ⚠ TPS Alert  
   Status: **Alright**  
   Current TPS: **14.8**  
     
3. /playtime <user>  
     
   🪪 QauiltyControl  
   Playtime: **2h 36m 33s**  
     
4. /server  
     
—--------------------------------------------------------------  
                    💻**Server Details**💻  
—--------------------------------------------------------------
                       **IP:** 6ix.serv.cx  
                **Modpack:** ATM 10 - Ver 7.0  
                      **RAM:** 14.2 GB  
                   **Status:** Online/Offline  
                 **UpTIme:** 3d 11h 42m/Offline  
—--------------------------------------------------------------

5. /ban <user>  
     
   🔨 QauiltyControl Has Been Banned.  
     
6. /kick <user>  
     
   👟 QauiltyControl Has Been Kicked.  
     
7. /restart  
     
   ⚙️ Restarting Server….  
     
8. /stop  
     
   🛑Shutting Down Server….

## **Permissions**

ADMIN_ROLE_ID

**will control:**

/console  
/ban  
/kick  
/restart  
/stop

**while everyone can use:**   
-Only the user that executes the command will be able to see the reply

/online  
/tps  
/playtime  
/server

