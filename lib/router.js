Router.configure({
  layoutTemplate: 'layout',
  loadingTemplate: 'loading',
  notFoundTemplate: 'notFound',
  waitOn: function() { 
    return [Meteor.subscribe('notifications')]
  }
});

PostsListController = RouteController.extend({
  template: 'postsList',
  increment: 9,
  postsLimit: function() { 
    return parseInt(this.params.postsLimit) || this.increment; 
  },
  findOptions: function() {
    return {sort: this.sort, limit: this.postsLimit()};
  },
  subscriptions: function() {
    this.postsSub = Meteor.subscribe('posts', this.findOptions());
  },
  posts: function() {
    return Posts.find({}, this.findOptions());
  },
  data: function() {
    var self = this;
    return {
      posts: self.posts(),
      ready: self.postsSub.ready,
      nextPath: function() {
        if (self.posts().count() === self.postsLimit())
          return self.nextPath();
      }
    };
  }
});

NewPostsController = PostsListController.extend({
  sort: {submitted: -1, _id: -1},
  nextPath: function() {
    return Router.routes.newPosts.path({postsLimit: this.postsLimit() + this.increment})
  }
});

BestPostsController = PostsListController.extend({
  sort: {likes: -1, submitted: -1, _id: -1},
  nextPath: function() {
    return Router.routes.bestPosts.path({postsLimit: this.postsLimit() + this.increment})
  }
});

FavoritePostsController = PostsListController.extend({
  sort: {submitted: -1, _id: -1},
  findOptions: function() {
    return { likeusers: Meteor.user()._id, sort: this.sort, limit: this.postsLimit()};
  },
  // subscriptions: function() {
  //   this.postsSub = Meteor.subscribe('posts', this.findOptions());
  // },
  posts: function() {
    return Posts.find({likeusers: Meteor.user()._id});
  },
  nextPath: function() {
    return Router.routes.favoritePosts.path({postsLimit: this.postsLimit() + this.increment})
  }

});

Router.route('/', {
  name: 'home',
  controller: NewPostsController
});

Router.route('/new/:postsLimit?', {name: 'newPosts'});

Router.route('/best/:postsLimit?', {name: 'bestPosts'});

Router.route('/favorite/:postsLimit?', {name: 'favoritePosts'});

Router.route('/posts/:_id', {
  name: 'postPage',
  waitOn: function() {
    return [
      // IRLibLoader.load('//apis.daum.net/maps/maps3.js?libraries=services&apikey=f836162338ea24d0e221975199009a2d'),
      Meteor.subscribe('singlePost', this.params._id),
      Meteor.subscribe('comments', this.params._id)
    ];
  },
  data: function() { 
    return Posts.findOne(this.params._id); 
  }
  // before: function() {
  //   if(this.data()) {
  //     // var userIds = this.data().map(function(p) {return p.userId});
  //     console.log('this.params._id: ' + this.params._id);

  //     Meteor.subscribe('commentAuthors', this.params._id);
  //   }
  // }
});

Router.route('/posts/:_id/edit', {
  name: 'postEdit',
  waitOn: function() { 
    return Meteor.subscribe('singlePost', this.params._id);
  },
  data: function() { return Posts.findOne(this.params._id); }
});

Router.route('/search', {
  name: 'search'
});


MapController = RouteController.extend({
  template: 'map',
  findOptions: function() {
    return {sort: this.sort,fields: {'title':1,'dish':1,'location':1,'imageUrl':1,'tel':1,'likes':1}};
    //return {sort: this.sort};
  },
  subscriptions: function() {
    this.postsSub = Meteor.subscribe('posts',this.findOptions());
  },
  data: function() {
    var self = this;
    return {
      posts: Posts.find({}, this.findOptions()),
      ready: self.postsSub.ready,
    }
  }
});

Router.route('/map', {
  name: 'map',
  controller: MapController
});

Router.route('/submit', {name: 'postSubmit'});

var requireLogin = function() {
  if (! Meteor.user()) {
    if (Meteor.loggingIn()) {
      this.render(this.loadingTemplate);
    } else {
      this.render('accessDenied');
    }
  } else {
    this.next();
  }
}

Router.onBeforeAction('dataNotFound', {only: 'postPage'});
Router.onBeforeAction(requireLogin, {only: 'postSubmit'});
