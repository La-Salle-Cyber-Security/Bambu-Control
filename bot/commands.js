export const commands = [
    {
        name: "printer",
        description: "Control Bambu printer via Bambu-Control",
        options: [
            {
                type: 1,
                name: "status",
                description: "Show current printer status",
            },
            {
                type: 1,
                name: "led",
                description: "Turn chamber light on/off",
                options: [
                    {
                        type: 3,
                        name: "state",
                        description: "on/off",
                        required: true,
                        choices: [
                            { name: "on", value: "on" },
                            { name: "off", value: "off" },
                        ],
                    },
                ],
            },
            {
                type: 1,
                name: "morse",
                description: "Send Morse code on the chamber light",
                options: [
                    {
                        type: 3,
                        name: "text",
                        description: "Text to send",
                        required: true,
                    },
                ],
            },
        ],
    },
];