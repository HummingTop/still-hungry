Posts = new Mongo.Collection('posts');

// Posts.initEasySearch(['title', 'location.city', 'location.division', 'location.address', 'dish'], {
//   'limit': 8,
//   'use': 'mongo-db'
// });

EasySearch.createSearchIndex('search_posts', {
  'field' : ['title', 'location.city', 'location.division', 'location.address'],
  'collection' : Posts,
  'limit' : 9,
  'use' : 'mongo-db'
});

Posts.allow({
  update: function(userId, post) { return ownsDocument(userId, post); },
  remove: function(userId, post) { return ownsDocument(userId, post); },
});

Posts.deny({
  update: function(userId, post, fieldNames) {
    // may only edit the following two fields:
    return (_.without(fieldNames, 'url', 'title').length > 0);
  }
});

Posts.deny({
  update: function(userId, post, fieldNames, modifier) {
    var errors = validatePost(modifier.$set);
    return errors.title || errors.url;
  }
});

validatePost = function (post) {
  var errors = {};

  if (!post.title)
    errors.title = "Please fill in a headline";
  
  if (!post.url)
    errors.url =  "Please fill in a URL";

  return errors;
}

Meteor.methods({
  postInsert: function(postAttributes) {
    check(this.userId, String);
    check(postAttributes, {
      title: String,
      url: String
    });
    
    var errors = validatePost(postAttributes);
    if (errors.title || errors.url)
      throw new Meteor.Error('invalid-post', "You must set a title and URL for your post");
    
    var postWithSameLink = Posts.findOne({url: postAttributes.url});
    if (postWithSameLink) {
      return {
        postExists: true,
        _id: postWithSameLink._id
      }
    }
    
    var user = Meteor.user();
    var post = _.extend(postAttributes, {
      userId: user._id, 
      author: user.username, 
      submitted: new Date(),
      commentsCount: 0,
      upvoters: [], 
      votes: 0,
      likeusers: [],
      likes: 0,
      likesCount: 0
    });
    
    var postId = Posts.insert(post);
    
    return {
      _id: postId
    };
  },
  
  upvote: function(postId) {
    check(this.userId, String);
    check(postId, String);
    
    var affected = Posts.update({
      _id: postId, 
      upvoters: {$ne: this.userId}
    }, {
      $addToSet: {upvoters: this.userId},
      $inc: {votes: 1}
    });
    
    if (! affected)
      throw new Meteor.Error('invalid', "You weren't able to upvote that post");
  },

  like: function(postId) {
    check(this.userId, String);
    check(postId, String);

    var affected = Posts.update({
      _id: postId,
      likeusers: {$ne: this.userId}
    }, {
      $addToSet: {likeusers: this.userId},
      $inc: {likes: 1}
    });

    if (! affected)
      throw new Meteor.Error('invalid', "You weren't able to like that post");
  },

  dislike: function(postId) {
    check(this.userId, String);
    check(postId, String);

    var affected = Posts.update({
      _id: postId
    }, {
      $pull: {likeusers: this.userId},
      $inc: {likes: -1}
    });

    if (! affected)
      throw new Meteor.Error('invalid', "You weren't able to like that post");
  }
  
});
