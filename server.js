var port = 8000;
/*var app = require('http').createServer(handler).listen(port, "0.0.0.0"),
	io = require('socket.io').listen(app),
	fs = require('fs'),
	sys = require('util'),
	exec = require('child_process').exec,
	child, child1;

app.listen(port);*/
	
	
	
var express = require('express');
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);

app.use(express.static(__dirname + '/public'));  
app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/views/index.html');
});

server.listen(port);




var connectCounter = 0;

function handler(req, res) {
	fs.readFile(__dirname+'/views/index.html', function(err, data) {
		if (err) {
			console.log(err);
			res.writeHead(500);
			return res.end('Error loading index.html');
		}
		
		res.writeHead(200);
		res.end(data);
	});
}

function prettyBaud(baudStr) {
	var baud = parseInt(baudStr);
	var ret = 'unknown';

	if (baud > 1000000) {
		baud = Math.round(baud/1000000);
		ret = baud + ' Mb/s';
	} else if (baud > 1000) {
		baud = round(baud/1000);
		ret = baud + ' Kb/s';
	} else {
		ret = baud + ' b/s';
	}

	return ret;
}

function prettyMemory(totalStr) {
	var total = parseInt(totalStr);
	var ret = "unknown";

	if (total > 999) {
		total = Math.round($total/1024);
		ret = total + ' GB';
	} else {
		ret = total + ' MB';
	}

	return ret;
}

io.sockets.on('connection', function(socket) {
	var memTotal, memUsed = 0, memFree = 0, memBuffered = 0, memCached = 0, sendData = 1, percentBuffered, percentCached, percentUsed, percentFree;
	var address = socket.handshake.address;

	console.log("New connection from " + address.address + ":" + address.port);
	connectCounter++; 
	console.log("NUMBER OF CONNECTIONS++: "+connectCounter);
	socket.on('disconnect', function() { connectCounter--;  console.log("NUMBER OF CONNECTIONS--: "+connectCounter);});
	
	var uptimesh = "uptime | tail -n 1 | awk '{print $3 $4 $5}'";
	var temperaturesh = "cat /sys/class/thermal/thermal_zone0/temp";
	var networkdatash = "sh ./lib/transfer_rate.sh";
	
	// Hostname
	child = exec("hostname", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			socket.emit('hostname', stdout); 
		}
	});
  
	// Kernel
    child = exec("uname -r", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			socket.emit('kernel', stdout); 
		}
	});
  
	// Uptime
	child = exec(uptimesh, function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			socket.emit('uptime', stdout); 
		}
	});
	
	setInterval(function(){
		child = exec(uptimesh, function (error, stdout, stderr) {
			if (error !== null) {
				console.log('exec error: ' + error);
			} else {
				socket.emit('uptime', stdout); 
			}
		});
	}, 60000);

	// Temperature
	child = exec(temperaturesh, function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			socket.emit('temperature', stdout + ' &deg;C'); 
		}
	});
	
	setInterval(function(){
		child = exec(temperaturesh, function (error, stdout, stderr) {
			if (error !== null) {
				console.log('exec error: ' + error);
			} else {
				socket.emit('temperature', stdout); 
			}
		});
	}, 5000);

	// Network
	child = exec(networkdatash, function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			var network = stdout.split(' ');
			socket.emit('network_data_down', prettyBaud(network[0])); 
			socket.emit('network_data_up', prettyBaud(network[1])); 
		}
	});
	
	setInterval(function(){
		child = exec(networkdatash, function (error, stdout, stderr) {
			if (error !== null) {
				console.log('exec error: ' + error);
			} else {
			var network = stdout.split(' ');
			socket.emit('network_data_down', prettyBaud(network[0])); 
			socket.emit('network_data_up', prettyBaud(network[1])); 
		}
		});
	}, 5000);
	
	// CPU
	setInterval(function(){
		child = exec("top -d 0.5 -b -n2 | grep 'Cpu(s)'|tail -n 1 | awk '{print $2 + $4}'", function (error, stdout, stderr) {
			if (error !== null) {
				console.log('exec error: ' + error);
			} else {
				var date = new Date().getTime();
				socket.emit('cpuUsageUpdate', date, parseFloat(stdout)); 
			}
		});
	}, 10000);
	
	// Memory total
    child = exec("free -m | awk '/Mem/ {print $2}'", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			memTotal = stdout;
			socket.emit('memoryTotal', stdout); 
		}
	});
	
    // Memory
	setInterval(function(){
		// Function for checking free memory
		child1 = exec("free -m | awk '/buffers\/cache/ {print $3}'", function (error, stdout, stderr) {
			if (error == null) {
				memFree = stdout;
			} else {
				sendData = 0;
				console.log('exec error: ' + error);
			}
		});
		
		// Function for checking memory used
		child1 = exec("free | awk '/buffers\/cache/ {print $3}'", function (error, stdout, stderr) {
			if (error == null) {
				memUsed = stdout;
			} else {
				sendData = 0;
				console.log('exec error: ' + error);
			}
		});

		// Function for checking memory buffered
		child1 = exec("free | awk '/Mem/ {print $6}'", function (error, stdout, stderr) {
			if (error == null) {
				memBuffered = stdout;
			} else {
				sendData = 0;
				console.log('exec error: ' + error);
			}
		});

		// Function for checking memory buffered
		child1 = exec("free | awk '/Mem/ {print $7}'", function (error, stdout, stderr) {
			if (error == null) {
				memCached = stdout;
			} else {
				sendData = 0;
				console.log('exec error: ' + error);
			}
		});

		if (sendData == 1) {
			percentUsed = Math.round(parseInt(memUsed)*100/parseInt(memTotal));
			percentFree = 100 - percentUsed;
			percentBuffered = Math.round(parseInt(memBuffered)*100/parseInt(memTotal));
			percentCached = Math.round(parseInt(memCached)*100/parseInt(memTotal));
			
			socket.emit('memoryUpdate', percentFree, percentUsed, percentBuffered, percentCached); 
		} else {
			sendData = 1;
		}
	}, 5000);
});
