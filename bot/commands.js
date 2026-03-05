export const commands = [
  {
    name: "printer",
    description: "Control Bambu printer via Bambu-Control",
    options: [
      {
        type: 1, // SUB_COMMAND
        name: "led",
        description: "Turn chamber light on/off",
        options: [
          {
            type: 3, // STRING
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
    ],
  },
];