const properties = require("properties")
const path = require("path")
const fs = require('fs-extra')
const { spawn } = require('child_process')
const { Dropbox } = require('dropbox');
const { fetch } = require('isomorphic-fetch')

const example = properties.createStringifier ()
    .header("Settings for KOLA launcher")

    .section({name: "dropbox"})
    .property({key: "token", value: "39384e957_56aa8d_90143", comment: "Secret code to be able to access yout dropbox"})
    .property({key: "location", value: "MyFolder/database.md5", comment: "The file to download from dropbox"})

    .property({key: "destination", value: "C:\\Program Files (x86)\\Notepad++\\", comment: "Where to put the downloaded file" })

    .section({name: "program"})
    .property({key: "location", value: "C:\\Program Files (x86)\\Notepad++\\notepad++.exe", comment: "The program to be launched after download of file"});

const file = path.join(process.cwd(), "settings.ini");

async function main() {
    printFancyHeader();

    const exists = await fs.exists(file)
    if (exists) {
        const settings = await readSettings(file)

        try {

            await canWriteDestination(settings)

            await executeDownload(settings)

            await launchProgram(settings)

        } catch(error) {
           console.error(error)
        }
    } else {
        await writeSettingsFile()
    }
};


function readSettings(file) {
    return new Promise(function(resolve, reject) {
        properties.parse(file, { path: true, sections: true },  function (error, obj) {
            if (error) reject(error)
            else resolve(obj)
        })
    })
}


async function executeDownload(settings) {

    var dbx = new Dropbox({ accessToken: settings.dropbox.token });

    const response = await dbx.filesDownload({ path: settings.dropbox.location })
        .catch((error) => {

            if (error.name === "FetchError") {
                console.log("Unable to download file, please check your internet connection");
                return false;
            }

            throw error;
        });

    if (response) {
        const { result } = response
        console.log("Downloading file:", result.name, "( version", result.rev, ")", "->", settings.dropbox.destination)

        await fs.writeFile(settings.dropbox.destination, result.fileBinary, 'utf8')

        console.log("File downloaded")

    }
}

async function canWriteDestination(settings) {
    const file = settings.dropbox.destination;

    return await fs.access(file, fs.constants.W_OK)
        .catch((err) => {
            throw new Error("Unable to write to file: " + file)
        });
}

async function launchProgram(settings) {
    const program = settings.program.location

    console.log("Starting process:", program)

    const child = spawn(program, [], {
        detached: true, stdio: 'ignore'
    })

    child.unref()

    console.log("This window will close in 2 seconds... ")

    await sleep(2000)
}

async function writeSettingsFile() {

    await new Promise(function(resolve, reject) {
        properties.stringify(example, {
            path: file
        }, resolve)
    })

    console.log("Settings file written to", file)
    console.log("Please fill it out with correct values")

    await sleep(1000)

    console.log("Program closes in 10 seconds...")

    await sleep(10000)
}

function printFancyHeader() {
    // http://patorjk.com/software/taag/#p=display&f=ANSI%20Shadow&t=KOLA%0ALAUNCHE
    console.log(["",
        " ██╗  ██╗ ██████╗ ██╗      █████╗                                    ",
        " ██║ ██╔╝██╔═══██╗██║     ██╔══██╗                                   ",
        " █████╔╝ ██║   ██║██║     ███████║                                   ",
        " ██╔═██╗ ██║   ██║██║     ██╔══██║                                   ",
        " ██║  ██╗╚██████╔╝███████╗██║  ██║                                   ",
        " ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝                                   ",
        "                                                                     ",
        " ██╗      █████╗ ██╗   ██╗███╗   ██╗ ██████╗██╗  ██╗███████╗██████╗  ",
        " ██║     ██╔══██╗██║   ██║████╗  ██║██╔════╝██║  ██║██╔════╝██╔══██╗ ",
        " ██║     ███████║██║   ██║██╔██╗ ██║██║     ███████║█████╗  ██████╔╝ ",
        " ██║     ██╔══██║██║   ██║██║╚██╗██║██║     ██╔══██║██╔══╝  ██╔══██╗ ",
        " ███████╗██║  ██║╚██████╔╝██║ ╚████║╚██████╗██║  ██║███████╗██║  ██║ ",
        " ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ",
        ""
    ].join("\n"))
}

function sleep(ms) {
    return new Promise(function(resolve, reject) {
        setTimeout(resolve, ms)
    })
}

try {
    main()
} catch (error) {
    console.error(error)
}