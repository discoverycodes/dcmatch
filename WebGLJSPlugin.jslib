// Unity WebGL JavaScript Plugin for Laravel Integration
mergeInto(LibraryManager.library, {
    
    // Get authentication token from Laravel session
    GetTokenFromJS: function() {
        var token = "";
        
        // Try to get token from localStorage first
        if (typeof(Storage) !== "undefined") {
            token = localStorage.getItem("auth_token") || "";
            if (token) {
                var returnStr = allocate(intArrayFromString(token), 'i8', ALLOC_NORMAL);
                return returnStr;
            }
        }
        
        // Try to get from cookie
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            if (cookie.indexOf("laravel_session=") === 0) {
                token = cookie.substring("laravel_session=".length, cookie.length);
                break;
            }
        }
        
        // Try to get from meta tag (Laravel CSRF pattern)
        var metaToken = document.querySelector('meta[name="api-token"]');
        if (metaToken) {
            token = metaToken.getAttribute('content');
        }
        
        var returnStr = allocate(intArrayFromString(token), 'i8', ALLOC_NORMAL);
        return returnStr;
    },
    
    // Get user data from Laravel
    GetUserDataFromJS: function() {
        var userData = "{}";
        
        // Check if user data is available in window object
        if (window.LaravelUser) {
            userData = JSON.stringify(window.LaravelUser);
        } else {
            // Try to get from localStorage
            var storedUser = localStorage.getItem("user_data");
            if (storedUser) {
                userData = storedUser;
            }
        }
        
        var returnStr = allocate(intArrayFromString(userData), 'i8', ALLOC_NORMAL);
        return returnStr;
    },
    
    // Send game result to Laravel dashboard
    SendGameResultToJS: function(scorePtr, winningsPtr) {
        var score = Pointer_stringify(scorePtr);
        var winnings = Pointer_stringify(winningsPtr);
        
        // Dispatch custom event for Laravel to listen
        var event = new CustomEvent('unityGameResult', {
            detail: {
                score: parseInt(score),
                winnings: parseFloat(winnings),
                timestamp: new Date().toISOString()
            }
        });
        
        window.dispatchEvent(event);
        
        // Also update localStorage for persistence
        var gameResult = {
            lastScore: parseInt(score),
            lastWinnings: parseFloat(winnings),
            lastPlayedAt: new Date().toISOString()
        };
        
        localStorage.setItem('last_game_result', JSON.stringify(gameResult));
    },
    
    // Show Laravel notification
    ShowLaravelNotification: function(messagePtr, typePtr) {
        var message = Pointer_stringify(messagePtr);
        var type = Pointer_stringify(typePtr);
        
        // Dispatch notification event for Laravel
        var event = new CustomEvent('unityNotification', {
            detail: {
                message: message,
                type: type // 'success', 'error', 'warning', 'info'
            }
        });
        
        window.dispatchEvent(event);
    },
    
    // Update balance in Laravel dashboard
    UpdateBalanceInJS: function(balancePtr) {
        var balance = Pointer_stringify(balancePtr);
        
        // Update balance display elements
        var balanceElements = document.querySelectorAll('.user-balance, #user-balance, [data-balance]');
        balanceElements.forEach(function(element) {
            element.textContent = 'R$ ' + parseFloat(balance).toFixed(2);
        });
        
        // Dispatch balance update event
        var event = new CustomEvent('balanceUpdated', {
            detail: {
                newBalance: parseFloat(balance)
            }
        });
        
        window.dispatchEvent(event);
    },
    
    // Get Laravel CSRF token
    GetCSRFToken: function() {
        var token = "";
        
        // Try to get from meta tag
        var metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            token = metaToken.getAttribute('content');
        }
        
        var returnStr = allocate(intArrayFromString(token), 'i8', ALLOC_NORMAL);
        return returnStr;
    },
    
    // Redirect to Laravel route
    RedirectToLaravel: function(routePtr) {
        var route = Pointer_stringify(routePtr);
        window.location.href = route;
    },
    
    // Show loading state in Laravel UI
    SetLoadingState: function(isLoadingPtr) {
        var isLoading = Pointer_stringify(isLoadingPtr) === "true";
        
        // Toggle loading elements
        var loadingElements = document.querySelectorAll('.game-loading, #game-loading');
        loadingElements.forEach(function(element) {
            element.style.display = isLoading ? 'block' : 'none';
        });
        
        // Disable/enable play buttons
        var playButtons = document.querySelectorAll('.play-button, #play-button');
        playButtons.forEach(function(button) {
            button.disabled = isLoading;
        });
    }
});