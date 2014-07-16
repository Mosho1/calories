log = console.log.bind(console)

var app = angular.module('plunker', ['ngDragDrop']);

app.value('max_results', 20)
app.value('token', 'aad5feefba474f199ed25ac5b943d1b4')
app.value('secret', '03df25e2805f4af39c2825e648f5eb75')
app.value('url', 'http://platform.fatsecret.com/rest/server.api')


app.service('oauth', function(token, secret){
  return OAuth({
        consumer: {
          public: token,
          secret: secret
        },
        signature_method: 'HMAC-SHA1'
      })
})

app.service('foodService', function($http, $parse, max_results, oauth, token, url, $timeout){
  var that = this;
  this.searchResults = [{'food_name':'banana', food_description:' a motherfucking banana'},
                        {'food_name':'apple', food_description:' a motherfucking apple'},
                        {'food_name':'pie', food_description:' a motherfucking pie'}
  
  
  ];
  this.history = {};
  this.numItems = 0;

  this.search = function(str){
      var request = {
          method:'GET',
          url: url,
          data : {
            search_expression: str,
            method: 'foods.search',
            max_results: max_results,
            format: 'json'
          }
      }
      request.params = oauth.authorize(request, token)
      return $http(request).then(function(result){
        if (+result.data.foods.total_results) {
          that.searchResults.splice(0,max_results);
          [].push.apply(that.searchResults, result.data.foods.food);
        }
        
      });
  };
  
  this.get = function(str){
      var request = {
          method:'GET',
          url: url,
          data : {
            food_id: str,
            method: 'food.get', 
            format: 'json'
          }
      }
      request.params = oauth.authorize(request, token)
      return $http(request); 
  };
	
})

app.service('mealService', function(foodService){
  
    this.meals = {
      'Breakfast': [],
      'Lunch': [], 
      'Dinner': []
    }
    
    this.addMeal = function(name){
      name = name || 'Meal ' + Object.keys(this.meals).length;
      this.meals[name] = [];
    }
    
    this.deleteMeal = function(name){
      delete this.meals[name];
    }
  
    this.addFood = function addFood($data, name, serving){
      
	    var item, array; 
	    array = name instanceof Array ? name : this.meals[name];
	    if (item = _.find(array,{food_id:$data.food_id})) { 
	      item.quantity += $data.quantity || 1;
	    } else {
	      serving = serving || $data.serving || getServingFromDesc($data.food_description);
	      array.push({food_id: $data.food_id, quantity: $data.quantity || 1, serving: serving});
	    }
	    if (!_.find(foodService.history,{food_id:$data.food_id})) { 
	      return foodService.get($data.food_id).then(function(result){
	        result.data.food.food_description = $data.food_description; 
	        result.data.food.serving = serving; 
	       
	        foodService.history[$data.food_id] = result.data.food;
	        this.numItems++;
	      });
	    } 
	  }
	  
	  this.deleteFood = function(index,name){
	    var array = name instanceof Array ? name : this.meals[name];
	    array.splice(index,1);
	  }
	  
	  this.changeFoodQuantity = function(index,name,amount){
  	  var array = name instanceof Array ? name : this.meals[name];
      var $data = array[index];
      $data.quantity += amount;
      if (!$data.quantity) {
        this.deleteFood(index,name);
      }
    }
	
  function getServingFromDesc(str){ 
	  var regex = /Per (.*) -/
	  var match = str.match(regex) || {1:0};
	  return match[1];
	}
  
  
})


app.controller('MainCtrl', function($scope, foodService, mealService, max_results) {
  $scope.searchString = "banana"; 
  $scope.numResults = 5;
  $scope.history = foodService.history;
  $scope.numItems = foodService.numItems;
  $scope.searchResults = foodService.searchResults;
  $scope.meals = mealService.meals;
  
  $scope.addMeal = mealService.addMeal;
  $scope.deleteMeal = mealService.deleteMeal;
  
  $scope.selectMenu = function(name){
    $scope.selectedMenu = name;
  }
  
  $scope.selectMeal = function(name){
    $scope.selectedMeal = name;
  }
  
  $scope.selectFoodItem = function(id){
    $scope.selectedFoodItem = id;
  }
  
  $scope.addFoodToSelectedMeal = function($data, $index){
    $scope.selectedMeal = $scope.selectedMeal || Object.keys($scope.meals)[0];
    mealService.addFood($data, $scope.selectedMeal, $scope.serving);  
  }
  
  $scope.increaseFoodQuantity = function(index,name,$event){
    var amount = $event.ctrlKey ? -1 : 1;
    mealService.changeFoodQuantity(index,name,amount)
  }
   
  $scope.foodSearch = function(str){
    var regex = /(\d+)(g)/;
    var match = str.match(regex);
    $scope.serving = (match || [])[0];
    str = str.replace(regex,'')
    foodService.search(str);
  }
    
  $scope.dropSuccessHandler = mealService.deleteFood;
		
	$scope.onDrop = mealService.addFood;
	
  $scope.$watch('searchString',$scope.foodSearch);  
  
  
  $scope.selectSearchResult = function(e){ 
        
        if (e.keyCode === 38 || e.keyCode === 40) {
          if ($scope.selectedFoodItem === undefined) {
              $scope.selectedFoodItem = e.keyCode === 38 ? 4 : 0;
          } else {
              $scope.selectedFoodItem = ($scope.selectedFoodItem + e.keyCode - 39).mod($scope.numResults); 
          }
        }
        if (e.keyCode === 13) {
          $scope.selectedMeal = $scope.selectedMeal || 0;
          if ($scope.selectedFoodItem !== undefined) {
              mealService.addFood($scope[$scope.selectedMenu][$scope.selectedFoodItem], 
                                  $scope.selectedMeal, $scope.serving);  
          }
        }
  }

 
 
});

Number.prototype.mod = function(n) {
  return ((this%n)+n)%n;
}

