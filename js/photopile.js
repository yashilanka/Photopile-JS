//
//  File:  photopile.js
//  Auth:  Brian W. Howell
//  Date:  12 April 2014
//

// ISSUES:
// When image source is set to '', broken image is displayed.
// Add width and height elements to thumbnails

//
// Photopile image gallery
//
var photopile = (function() {

    //-------------------------------------------------------------------------
    //  PHOTOPILE CUSTOMIZATIONS
    //  Perform basic customizations to the photo pile gallery settings here
    //-------------------------------------------------------------------------

    var s = {
        thumbs : {            // Thumbnails
            overlap   :  50,  // overlap amount (px)
            rotation  :  45,  // maximum rotation (deg)
            zindex    :  5,   // max number of layers in the pile
            border    :  2    // thumbnail image padding (px)
        },
        photo : {              // Photo Container
            zindex    :  100,  // z-index (show above all)
            border    :  10    // border width around image
        },                     // Other
        fadeDuration  :  300,  // thumbnail fade duration (ms)
        viewDuration  :  700   // pickup, putDown duration (ms)
    }

    // ----- END CUSTOMIZATIONS -----

    var el     = $('ul.photopile');  // gallery ul element
    var thumbs = el.children();      // gallery ul li elements

    // Initializes photopile gallery thumbnails, photo container, and removes .js styles.
    function init() {

        // init thumbnails
        thumbs.each( function() {
            $(this).children().css( 'padding', s.thumbs.border + 'px' );
            thumb.bindUIActions($(this));
            thumb.setRotation($(this));
            thumb.setOverlap($(this));
            thumb.setZ($(this));
        });

        photo.init(); // init photo container
        
        // undo .js styles and pad the photopile-wrapper
        $('.js div.photopile-wrapper').css({
            'background-image' : 'none',
            'padding' : s.thumbs.overlap + 'px'
        });
        $('.js ul.photopile').css('display', 'inline-block');
    
    } // init

    //
    // Photopile thumbnails
    //
    var thumb = {

        active : 'photopile-active-thumbnail',  // active(clicked) thumbnail class name

        // Binds UI actions to thumbnail.
        bindUIActions : function( thumb ) {
            var self = this;
            
            // Mouseover & Mouseout | Change thumbnail z-index
            thumb.mouseover( function() { $(this).css( 'z-index', s.thumbs.zindex ); }); // top
            thumb.mouseout( function() { $(this).css( 'z-index', s.thumbs.zindex - 1 ); }); // -1

            // On click | open image in the photo container
            thumb.click( function(e) {
                e.preventDefault();
                if ( $(this).hasClass(self.active) ) return;
                photo.pickup( $(this) );
            });

        }, // bindUIActions

        // Sets thumbnail overlap amount.
        setOverlap : function( thumb ) {
            thumb.css( 'margin', ((s.thumbs.overlap * -1) / 2) + 'px' );
        },

        // Sets thumbnail z-index to random layer.
        setZ : function( thumb ) {
            thumb.css({ 'z-index' : Math.floor((Math.random() * s.thumbs.zindex) + 1) });
        },

        // Sets thumbnail rotation randomly.
        setRotation : function( thumb ) {
            var min = -1 * s.thumbs.rotation;
            var max = s.thumbs.rotation;
            var r = Math.floor( Math.random() * (max - min + 1)) + min;
            thumb.css({ 'transform' : 'rotate(' + r + 'deg)' });
        },

        // ----- ACTIVE THUMBNAIL -----

        // Get & set the active thumbnail.
        getActive : function() { return  $('li.' + this.active).first(); },
        setActive : function( thumb ) { thumb.addClass(this.active); },

        // Return active thumbnail properties
        getActiveOffset   : function() { return $('li.' + this.active).offset(); },
        getActiveHeight   : function() { return $('li.' + this.active).height(); },
        getActiveWidth    : function() { return $('li.' + this.active).width(); },
        getActiveImgSrc   : function() { return $('li.' + this.active).children().first().attr('href'); },
        getActiveRotation : function() {
                var transform = $('li.' + this.active).css("transform");
                var values = transform.split('(')[1].split(')')[0].split(',');
                var angle = Math.round( Math.asin( values[1]) * (180/Math.PI) );
                return angle;
        },

        // Returns a shift amount used to better position the photo container on top of the 
        // active thumb since it's offset is skewed by it's rotation.
        getActiveShift : function() {
            return ( this.getActiveRotation() < 0 )
                ? -( this.getActiveRotation(thumb) * 0.40 )
                :  ( this.getActiveRotation(thumb) * 0.40 );
        },

        // Removes the active class from all thumbnails.
        clearActiveClass : function() { $('li.' + this.active).fadeTo(s.fadeDuration, 1).removeClass(this.active); }

    } // thumbnail
 
    //
    // Photopile photo container (for fullsize image)
    //
    var photo = {

        // Define photo container elements
        container : $( '<div id="photopile-active-image-container"/>' ), 
        image     : $( '<img id="photopile-active-image" />'),

        isPickedUp     : false,  // track if photo container is currently viewable
        fullSizeWidth  : null,   // will hold width of active thumbnail's fullsize image
        fullSizeHeight : null,   // will hold height of active thumbnail's fullsize image
        loadingWidth   : null,   // will hold width of loading image
        loadingHeight  : null,   // will hold height of loading image
        windowPadding  : 20,     // minimum space between container and edge of window (px)
        
        // Initializes the photo container.
        // Adds elements to DOM, saves container selectors, and preloads the loading image.
        init : function() {

            $('body').append( this.container );
            this.container.css({
                'display'  : 'none',
                'position' : 'absolute',
                'padding'  : s.thumbs.padding,
                'z-index'  : s.photo.zindex
            });

            this.container.append( this.image );
            this.image.css('display', 'block').fadeIn(s.fadeDuration);
            this.container = $('div#photopile-active-image-container');
            this.image = this.container.children();
            
            var self = this;
            var loading = new Image;
            loading.src = s.photo.loading;
            loading.onload = function() {
                self.loadingWidth = this.width;
                self.loadingHeight = this.height;
            };
        
        }, // init

        // Simulates picking up a photo from the photopile.
        pickup : function( thumbnail ) {
            var self = this;

            if ( self.isPickedUp ) {
                self.putDown( function() { self.pickup( thumbnail ); }); // put down, then pickup
            } else {
                self.isPickedUp = true;
                thumb.clearActiveClass();
                thumb.setActive( thumbnail );
                self.loadImage( thumb.getActiveImgSrc(), function() {
                    // fade in image and enlarge container when load is complete
                    self.image.fadeTo(s.fadeDuration, '1');
                    self.enlarge();
                    $('body').bind('click', function() { // bind event to close container
                        self.putDown();
                    });
                });
            }

        }, // pickup

        // Simulates putting a photo down, or returning to the photo pile.
        putDown : function( callback ) {
            self = this;
            $('body').unbind();
            self.container.stop().animate({
                'top'     : thumb.getActiveOffset().top + thumb.getActiveShift(),
                'left'    : thumb.getActiveOffset().left + thumb.getActiveShift(),
                'width'   : thumb.getActiveWidth() + 'px',
                'height'  : thumb.getActiveHeight() + 'px',
                'padding' : s.thumbs.border + 'px'
            }, s.viewDuration, function() {
                self.isPickedUp = false;
                thumb.clearActiveClass();
                self.container.fadeOut( s.fadeDuration, function() {
                    if (callback) callback();
                });
            });
        },

        // Handles the loading of an image when a thumbnail is clicked.
        loadImage : function ( src, callback ) {
            var self = this;
            // don't display image until next is loaded and ready
            this.image.css('opacity', '0');
            self.startPosition();
            var img = new Image;
            img.src = src;
            img.onload = function() {
                self.fullSizeWidth = this.width;
                self.fullSizeHeight = this.height;
                self.setImageSource( src );
                if (callback) callback();
            };
        },

        // Positions the container over the active thumb and brings it into view.
        startPosition : function() {
            this.container.css({
                'top'       : thumb.getActiveOffset().top + thumb.getActiveShift(),
                'left'      : thumb.getActiveOffset().left + thumb.getActiveShift(),
                'transform' : 'rotate(' + thumb.getActiveRotation() + 'deg)',
                'width'     : thumb.getActiveWidth() + 'px',
                'height'    : thumb.getActiveHeight() + 'px',
                'padding'   : s.thumbs.border
            }).fadeTo(s.fadeDuration, '1');
            thumb.getActive().fadeTo(s.fadeDuration, '0');
        },

        // Enlarges the photo container based on window and image size (loadImage callback).
        enlarge : function() {

            var windowHeight = window.innerHeight ? window.innerHeight : $(window).height(); // mobile safari hack
            var availableWidth = $(window).width() - (2 * this.windowPadding);
            var availableHeight = windowHeight - (2 * this.windowPadding);
            
            if ((availableWidth < this.fullSizeWidth) && ( availableHeight < this.fullSizeHeight )) {
                // determine which dimension will allow image to fit completely within the window
                if ( (availableWidth * (this.fullSizeHeight / this.fullSizeWidth)) > availableHeight ) {
                    this.enlargeToWindowHeight( availableHeight );
                } else {
                    this.enlargeToWindowWidth( availableWidth );
                }
            } else if ( availableWidth < this.fullSizeWidth ) {
                this.enlargeToWindowWidth( availableWidth );
            } else if ( availableHeight < this.fullSizeHeight ) {
                this.enlargeToWindowHeight( availableHeight );
            } else {
                this.enlargeToFullSize();
            }
        
        }, // enlarge

        // Fullsize image will fit in window.
        enlargeToFullSize : function() {
            this.container.css('transform', 'rotate(0deg)').animate({
                'top'     : ($(window).scrollTop()) + ($(window).height() / 2) - (this.fullSizeHeight / 2),
                'left'    : ($(window).scrollLeft()) + ($(window).width() / 2) - (this.fullSizeWidth / 2),
                'width'   : (this.fullSizeWidth - (2 * s.photo.border)) + 'px',
                'height'  : (this.fullSizeHeight - (2 * s.photo.border)) + 'px',
                'padding' : s.photo.border + 'px',
            });
        },

        // Fullsize image width exceeds window width.
        enlargeToWindowWidth : function( availableWidth ) {
            var adjustedHeight = availableWidth * (this.fullSizeHeight / this.fullSizeWidth);
            this.container.css('transform', 'rotate(0deg)').animate({
                'top'     : $(window).scrollTop()  + ($(window).height() / 2) - (adjustedHeight / 2),
                'left'    : $(window).scrollLeft() + ($(window).width() / 2)  - (availableWidth / 2),
                'width'   : availableWidth + 'px',
                'height'  : adjustedHeight + 'px',
                'padding' : s.photo.border + 'px'
            });
        },

        // Fullsize image height exceeds window width.
        enlargeToWindowHeight : function( availableHeight ) {
            var adjustedWidth = availableHeight * (this.fullSizeWidth / this.fullSizeHeight);
            this.container.css('transform', 'rotate(0deg)').animate({
                'top'     : $(window).scrollTop()  + ($(window).height() / 2) - (availableHeight / 2),
                'left'    : $(window).scrollLeft() + ($(window).width() / 2)  - (adjustedWidth / 2),
                'width'   : adjustedWidth + 'px',
                'height'  : availableHeight + 'px',
                'padding' : s.photo.border + 'px'
            });
        },

        // Sets the photo containers img src.
        setImageSource : function( src ) { 
            this.image.attr('src', src).css({
                'width'      : '100%',
                'height'     : '100%',
                'margin-top' : '0' 
            });
        }

    }; // photo

    //--------------------
    //  Photopile API
    //--------------------

    return { scatter : init }

})(); // photopile


// !!! Initialize the photopile !!!
photopile.scatter();


