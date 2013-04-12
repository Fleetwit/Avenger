# Avenger
Avenger is a websocket load-testing tool.

Avenger can execute scenarios written in Javascript, and exports the data of your choice to a log. The included Log Visualizer will chart your logs so you can see the response time in function of the number of online users and other data.


**Distributed testing**

Avenger can work as part of a network, where the load testing will be distributed among many computers.

Just run the included "Central Command" server,and all the Avenger clients will connect and wait for instructions. Use the included HTML Central COmmand tool to connect to the Central Command server and remotely launch load tests that will be distributed among all the available Avenger clients. The logs will be transfered to the server so that you can visualize them using the Log Visualizer.

**Usage (stand-alone mode)**

To create a new load test on ws://127.0.0.1:8000/ with 20.000 simulated clients, using the scenario "Load", with one new client created every 5ms and using a single core of the CPU:

> `node main.js -host 127.0.0.1 -port 8000 -n 20000 -scenario Load -thread 1 -interval 5 -savestats true -start true`


**Usage (network mode)**

To run a distributed load test, first run the Central Command:

> `node remote.js`

Now launch Avenger on all the machine you whish to use for the distributed load test. Assuming the Central Command's IP is 192.168.0.1:

> `node main.js -central true -thread 1 -savestats true -cc_host 192.168.0.1`


Now you are ready to command the clients.

In a browser, launch /control/index.html, enter the Central Command's websocket address and click Connect.

Once connected, the control interface will appear. Enter the parameters, and click [execute]. You will have a real-time update on the status of each client's simulation.

Once the simulation ended, open /stats/index.html in a browser to visualize the data.
