/*******************************************************************************
 * Copyright (c) 2013-2015 Sierra Wireless and others.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * and Eclipse Distribution License v1.0 which accompany this distribution.
 *
 * The Eclipse Public License is available at
 *    http://www.eclipse.org/legal/epl-v10.html
 * and the Eclipse Distribution License is available at
 *    http://www.eclipse.org/org/documents/edl-v10.html.
 *
 * Contributors:
 *     Sierra Wireless - initial API and implementation
 *******************************************************************************/

angular.module('resourceDirectives', [])

    .directive('resource', function ($compile, $routeParams, $http, dialog, $filter, lwResources, helper,$rootScope) {
        return {
            restrict: "E",
            replace: true,
            scope: {
                resource: '=',
                parent: '=',
                settings: '='
            },
            templateUrl: "partials/resource.html",
            link: function (scope, element, attrs) {
               if(scope.resource){

                   scope.resource.path = scope.parent.path + "/" + scope.resource.def.id;
                   scope.resource.read = {tooltip: "Read <br/>" + scope.resource.path};
                   scope.resource.write = {tooltip: "Write <br/>" + scope.resource.path};
                   scope.resource.exec = {tooltip: "Execute <br/>" + scope.resource.path};
                   scope.resource.execwithparams = {tooltip: "Execute with parameters<br/>" + scope.resource.path};
                   scope.resource.observe = {tooltip: "Observe <br/>" + scope.resource.path};



               }

                scope.readable = function () {
                    if (scope.resource.def.hasOwnProperty("operations")) {
                        return scope.resource.def.operations.indexOf("R") != -1;
                    }
                    return false;
                };

                scope.writable = function () {
                    if (scope.resource.def.instancetype != "multiple") {
                        if (scope.resource.def.hasOwnProperty("operations")) {
                            return scope.resource.def.operations.indexOf("W") != -1;
                        }
                    }
                    return false;
                };

                scope.executable = function () {
                    if (scope.resource.def.instancetype != "multiple") {
                        if (scope.resource.def.hasOwnProperty("operations")) {
                            return scope.resource.def.operations.indexOf("E") != -1;
                        }
                    }
                    return false;
                };

                scope.startObserve = function () {
                    var format = scope.settings.single.format;
                    var uri = "api/clients/" + $routeParams.clientId + scope.resource.path + "/observe";
                    $http.post(uri, null, {params: {format: format}})
                        .success(function (data, status, headers, config) {

                            // data = {"status":"CONTENT","valid":true,"success":true,"failure":false,"content":{"id":scope.resource.id,"value":generateRandomValue(10,100)}};
                            helper.handleResponse(data, scope.resource.observe, function (formattedDate) {
                                if (data.success) {
                                    scope.resource.observed = true;
                                    if ("value" in data.content) {

                                        scope.resource.value = data.content.value;

                                        // single value
                                        doSliderStuff(scope.parent.path, scope.resource.value, scope.resource.def.name);
                                    } else if ("values" in data.content) {
                                        // multiple instances
                                        var tab = new Array();
                                        for (var i in data.content.values) {
                                            tab.push(i + "=" + data.content.values[i]);
                                        }
                                        scope.resource.value = tab.join(", ");
                                    }
                                    scope.resource.valuesupposed = false;
                                    scope.resource.tooltip = formattedDate;
                                }
                            });
                        }).error(function (data, status, headers, config) {

                        errormessage = "Unable to start observation on resource " + scope.resource.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                        dialog.open(errormessage);
                        console.error(errormessage);
                    });
                };

                scope.stopObserve = function () {
                    var uri = "api/clients/" + $routeParams.clientId + scope.resource.path + "/observe";
                    $http.delete(uri)
                        .success(function (data, status, headers, config) {
                            scope.resource.observed = false;
                            scope.resource.observe.stop = "success";
                        }).error(function (data, status, headers, config) {
                        errormessage = "Unable to stop observation on resource " + scope.resource.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                        dialog.open(errormessage);
                        console.error(errormessage);
                    });
                };

                // function generateRandomValue(max, min){
                //     return Math.floor(Math.random() * (+max - +min))+ +min;
                // }

                // scope.read = function() {
                //     var format = scope.settings.single.format;
                //     var uri = "api/clients/" + $routeParams.clientId + scope.resource.path;
                //     $http.get(uri, {params:{format:format}})
                //     .success(function(data, status, headers, config) {
                //         // manage request information
                //     	helper.handleResponse(data, scope.resource.read, function (formattedDate){
                //     		if (data.success && data.content) {
                //                 if("value" in data.content) {
                //                     // single value
                //                     scope.resource.value = data.content.value;
                //                 }
                //                 else if("values" in data.content) {
                //                     // multiple instances
                //                     var tab = new Array();
                //                     for (var i in data.content.values) {
                //                         tab.push(i+"="+data.content.values[i]);
                //                     }
                //                     scope.resource.value = tab.join(", ");
                //                 }
                //                 scope.resource.valuesupposed = false;
                //                 scope.resource.tooltip = formattedDate;
                //             }
                //     	});
                //     }).error(function(data, status, headers, config) {
                //         errormessage = "Unable to read resource " + scope.resource.path + " for "+ $routeParams.clientId + " : " + status +" "+ data;
                //         dialog.open(errormessage);
                //         console.error(errormessage);
                //     });
                // };
                //

                // $scope.readSlider = function () {
                //     $scope.sliderObj1 = sliderObj1.noUiSlider.get();
                //     $scope.minSliderValue = $scope.sliderObj1[0];
                //     $scope.maxSliderValue= $scope.sliderObj1[1];
                // };




                /********************Slider *****************************/

                scope.resetSlider = function (id) {
                    // sliderObj1.noUiSlider.set(0,24,100);

                    if (id) {
                        var slider = document.getElementById(id);
                    }
                    if (slider) {
                        if (slider.noUiSlider) {
                            slider.noUiSlider.destroy();
                        } else {
                            var handleValue = [12, 24, 36];
                            var rangeValue = [0, 100];
                        }

                        createSlider(handleValue, slider, rangeValue);
                    }

                };

                function doSliderStuff(id, value, name) {
                    var index = 0;

                    var rangeValue = [0, 100];
                    var handleValue = [12, 24, 36];
                    var doUpdate = false;
                    var updateRange = false;
                    var updateHandleValue = false;
                    switch (name) {
                        case "Min Range Value":
                            rangeValue[0] = value;
                            doUpdate = true;
                            updateRange = true;
                            break;
                        case "Max Range Value":
                            rangeValue[1] = value;
                            updateRange = true;
                            doUpdate = true;
                            break;
                        case "Min Measured Value":
                            index = 0;
                            updateHandleValue = true;
                            doUpdate = true;
                            break;
                        case "Max Measured Value":
                            index = 2;
                            updateHandleValue = true;
                            doUpdate = true;
                            break;
                        case "Sensor Value":
                            index = 1;
                            updateHandleValue = true;
                            doUpdate = true;
                            break;
                    }

                    if (doUpdate) {
                        if (id) {
                            var slider = document.getElementById(id);
                        }
                        if (slider) {
                            if (slider.noUiSlider) {
                                handleValue = slider.noUiSlider.get();
                                slider.noUiSlider.destroy();
                            } else {
                                handleValue = [12, 24, 36];
                            }
                            if (updateHandleValue) {
                                handleValue[index] = value;
                            }

                            createSlider(handleValue, slider, rangeValue);
                        }
                    }
                }

                function createSlider(handleData, slider, rangeValue) {
                    // rangeValue = [0,100];
                    noUiSlider.create(slider, {
                        start: handleData,
                        behaviour: 'tap',
                        connect: [false,true,true,false],
                        tooltips: true,
                        // format: wNumb({
                        //     decimals: 0
                        // }),
                        range: {
                            'min': rangeValue[0],
                            'max': rangeValue[1]
                        },
                        pips: {
                            mode: 'positions',
                            values: [0, 10, 20, 30, 50, 40, 50, 60, 70 ,80 ,90, 100],
                            density: 4,
                            stepped: true
                        }
                    });

                    var connect = slider.querySelectorAll('.noUi-connect'); /*****Slider Colour*******/
                    var classes = ['c-1-color', 'c-2-color'];

                    for (var i = 0; i < connect.length; i++) {
                        connect[i].classList.add(classes[i]);
                    }

                    // slider.setAttribute('disabled', true);       /*****Slider Freeze*******/

                }

                /******************HARD CODED DATA**********************/


                scope.read = function () {
                    var format = scope.settings.single.format;
                    var uri = "api/clients/" + $routeParams.clientId + scope.resource.path;
                    $http.get(uri, {params: {format: format}})
                        .success(function (data, status, headers, config) {
                            // data = {"status":"CONTENT","valid":true,"success":true,"failure":false,"content":{"id":scope.resource.id,"value":generateRandomValue(20,60)}};
                            // manage request information
                            helper.handleResponse(data, scope.resource.read, function (formattedDate) {
                                if (data.success && data.content) {
                                    if ("value" in data.content) {
                                        // single value
                                        scope.resource.value = data.content.value;
                                        doSliderStuff(scope.parent.path, scope.resource.value, scope.resource.def.name);
                                        if(scope.resource.def.id==5603)
                                        {
                                            var tempName = scope.resource.path;
                                            $rootScope[tempName] = scope.resource.value;
                                        }
                                        if(scope.resource.def.id==5604)
                                        {
                                            var tempName = scope.resource.path;
                                            $rootScope[tempName] = scope.resource.value;
                                        }
                                        // if(scope.resource.def.id==5601){
                                        //
                                        //     customRead();
                                        // }
                                    } else if ("values" in data.content) {
                                        // multiple instances
                                        var tab = new Array();
                                        for (var i in data.content.values) {
                                            tab.push(i + "=" + data.content.values[i]);
                                        }
                                        scope.resource.value = tab.join(", ");
                                    }
                                    scope.resource.valuesupposed = false;
                                    scope.resource.tooltip = formattedDate;
                                }
                            });
                        }).error(function (data, status, headers, config) {
                        errormessage = "Unable to read resource " + scope.resource.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                        dialog.open(errormessage);
                        console.error(errormessage);
                    });
                };

                // function customRead(){
                //     scope.resource.path = 5602;
                //     setTimeout(function(){scope.read();}, 1000);
                //     setTimeout(function(){scope.resource.path = 5601;}, 2000);
                // }


                scope.write = function () {
                    $('#writeModalLabel').text(scope.resource.def.name);
                    $('#writeInputValue').val(scope.resource.value);
                    $('#writeSubmit').unbind();
                    $('#writeSubmit').click(function (e) {
                        e.preventDefault();
                        var value = $('#writeInputValue').val();

                        if (value != undefined) {
                            $('#writeModal').modal('hide');

                            var rsc = {};
                            rsc["id"] = scope.resource.def.id;
                            value = lwResources.getTypedValue(value, scope.resource.def.type);
                            rsc["value"] = value;

                            var format = scope.settings.single.format;
                            $http({
                                method: 'PUT',
                                url: "api/clients/" + $routeParams.clientId + scope.resource.path,
                                data: rsc,
                                headers: {'Content-Type': 'application/json'},
                                params: {format: format}
                            })
                                .success(function (data, status, headers, config) {
                                    helper.handleResponse(data, scope.resource.write, function (formattedDate) {
                                        if (data.success) {
                                            scope.resource.value = value;
                                            scope.resource.valuesupposed = true;
                                            scope.resource.tooltip = formattedDate;
                                        }
                                    });
                                }).error(function (data, status, headers, config) {
                                errormessage = "Unable to write resource " + scope.resource.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                                dialog.open(errormessage);
                                console.error(errormessage);
                            });
                        }
                    });

                    $('#writeModal').modal('show');
                };



                scope.exec = function () {
                    $http.post("api/clients/" + $routeParams.clientId + scope.resource.path)
                        .success(function (data, status, headers, config) {
                            helper.handleResponse(data, scope.resource.exec);
                            scope.resetSlider(scope.parent.path);
                        }).error(function (data, status, headers, config) {
                        errormessage = "Unable to execute resource " + scope.resource.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                        dialog.open(errormessage);
                        console.error(errormessage);
                    });
                };

                scope.execWithParams = function () {
                    $('#writeModalLabel').text(scope.resource.def.name);
                    // $('#writeInputValue1').val(scope.resource.value);
                    $('#writeSubmit').unbind();
                    $('#writeSubmit').click(function (e) {
                        e.preventDefault();
                        var value1 = $('#writeInputValue1').val();
                        var value2 = $('#writeInputValue2').val();
                        if(!value1){
                            alert("Please enter value 1")
                        }
                        if(!value2){
                            alert("Please enter value 2")
                        }
                        if(value1>value2){
                            alert("Value 1 must be smaller than value 2")
                        }
                        var value = value1+","+value2;


                        if (value) {
                            $('#writeModal').modal('hide');

                            $http({
                                method: 'POST',
                                url: "api/clients/" + $routeParams.clientId + scope.resource.path,
                                data: value
                            })
                                .success(function (data, status, headers, config) {
                                    helper.handleResponse(data, scope.resource.exec);


                                    doSliderStuff(scope.parent.path, value1, "Min Measured Value");

                                    setTimeout(function(){
                                        doSliderStuff(scope.parent.path, value2, "Max Measured Value");
                                    }, 1000);
                                }).error(function (data, status, headers, config) {
                                errormessage = "Unable to execute resource " + scope.resource.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                                dialog.open(errormessage);
                                console.error(errormessage);
                            });
                        }
                    });
                    $('#writeModal').modal('show');
                };




                //On load
                // var timeIntervals = {
                //
                //     "/3303/0/5601":1000,
                //     "/3303/0/5602":2000,
                //     "/3303/0/5603":3000,
                //     "/3303/0/5604":4000,
                //     "/3303/0/5605":5000,
                //     "/3303/0/5700":6000,
                //     "/3303/0/5701":7000,
                //
                //     "/3304/0/5601":8000,
                //     "/3304/0/5602":9000,
                //     "/3304/0/5603":10000,
                //     "/3304/0/5604":11000,
                //     "/3304/0/5605":12000,
                //     "/3304/0/5700":13000,
                //     "/3304/0/5701":14000
                //
                // };

                // function callAtInterval() {
                //     if(scope.resource.def.id==5603 || scope.resource.def.id==5604 || scope.resource.def.id==5701){
                //         console.log(new Date());
                //         scope.read();
                //     }
                // }
                // if(timeIntervals[scope.resource.path]){
                //     setTimeout(function(){callAtInterval();}, timeIntervals[scope.resource.path]);
                // }




            }
        };
    });
