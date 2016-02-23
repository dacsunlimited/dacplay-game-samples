// This is the rule definition for demo dice game
// All data structrue are defined in JSON in javascript, and being mapped to variant object in C++, be packed before storing in database
// Validate and parse this script before uploading, tools: http://lisperator.net/uglifyjs/parser
// require("play.js")
// TODO: Add the substitute for FC_CAPTURE_AND_THROW and FC_ASSERT
// TODO: Input: {game_input}, Output: {operation_game_data, wallet_transaction_record, game_result_transaction}

var

PLAY = PLAY || {},

BTS_BLOCKCHAIN_NUM_DELEGATES = 101,

BTS_BLOCKCHAIN_NUM_DICE = Math.floor(BTS_BLOCKCHAIN_NUM_DELEGATES / 10),

BTS_BLOCKCHAIN_DICE_RANGE = 10000,

BTS_BLOCKCHAIN_DICE_HOUSE_EDGE = 0;

PLAY.version = "0.0.2";

// TODO: We should not have the assumption that the asset id equals to game id.
// TODO: The game info and game asset info should be loaded from "outside" when init the game engine instead.
PLAY.game_id = 1;
PLAY.game_asset = {
        asset_id : 1,
        symbol : "DICE"
    };
/*
 * Play this game with input in the context to blockchain and wallet
 * V8_API: wallet::get_transaction_fee [Deprecated]
 * V8_API: blockchain::get_account_record [Deprecated]
 * V8_API: play_account::active_key(deprecated)
 *
 * input is a variant object passed in by v8 api
 * input demo
    {
        "from_account_name": "alice",
        "amount":             10.2,
        "odds":            3,
        "guess":           1
    }
 * provided with PLAY_CODE = [from_account, to_account, amount, memo, PLAY_CODE(optional)]
 * @return PLAY_CODE
 */
PLAY.test = function()
{
  print("test function.");
};

PLAY.play = function (blockchain, wallet, input){
    //try {    
     
    // V8_Vaild     
    //FC_ASSERT( input.amount > 0 );     
    //FC_ASSERT( input.odds > 0 );    
     
    // V8_API: blockchain::get_asset_record
    var asset_record = blockchain.get_asset_record(PLAY.game_asset.symbol);
    print(asset_record);
    //FC_ASSERT( asset_rec.valid() );

    var amount_to_play = Math.ceil( input.amount * asset_record.precision );
   print( amount_to_play );
    // V8_Valid
    // FC_ASSERT( amount_to_play > 0 );

    // V8_API: constructor for asset, and accessor to id
    var chips_to_play = {
      "amount"  : amount_to_play,
      "asset_id": asset_record.id
   };

   return [input.from_account_name, input.from_account_name, chips_to_play, "play dice"];

    //} FC_CAPTURE_AND_RETHROW( (params) )
};

/*
 * Evaluate the game operation
 *

    // V8_API: eval_state_current_state::store_game_data_record [Deprecated]
    // eval_state_current_state.store_game_data_record(PLAY.game_id, data_index, game_data_rec);
 *
 * @return balances for sub from eval_state and store to pending_state
 * {
   "to_balances": [to_balance],  // will be stored and sub from current eval_state
    "datas" : [game_data]        // if directly return the data_id instead of a object, meaning to remove this data
 * }
 */
PLAY.evaluate = function(eval_state, pending_state, input){
    // V8_Valid
    //if( input.odds < 1 || input.odds < input.guess || input.guess < 1)
    //    FC_CAPTURE_AND_THROW( invalid_dice_odds, (odds) );

    // V8_API: eval_state_current_state::get_asset_record
   var dice_asset_record = pending_state.get_asset_record(PLAY.game_asset.symbol);
   print( dice_asset_record );
    // V8_Valid
    //if( !dice_asset_record )
        //FC_CAPTURE_AND_THROW( unknown_asset_symbol, ( eval_state.trx.id() ) );

   var dice_amount = Math.ceil( input.amount * dice_asset_record.precision );
   print( dice_amount );

   var trx_id = eval_state.get_transaction_id();
   print( trx_id );

   var hash_array = trx_id_to_hash_array(trx_id);
   print ( hash_array );

   var data_index = hash_array[0];
   print ( data_index );

    // For each transaction, there must be only one dice operatiion exist
    // TODO: improve the rule id representation for rule record
    // V8_API: eval_state_current_state::get_game_data_record
    var cur_record = pending_state.get_game_data_record(PLAY.game_id, data_index);
    // V8_Valid
    //if( cur_record )
        //FC_CAPTURE_AND_THROW( duplicate_dice_in_transaction, ( eval_state.trx.id() ) );

   var to_balance = {
      // TODO: Game Logic: this does not means the balance are now stored in balance record, just over pass the api
      // the dice record are not in any balance record, they are over-fly-on-sky.
      // equal to use zero_condition(withdraw_with_signature(), dice_asset_record->id);
      // XTS4Attt64KDdan23RJ1rf98cNPAmAp1YnSN = (convert_to_native_address 1Dice12345612345612345612345XLJ3zy)
      "owner" : "XTS4Attt64KDdan23RJ1rf98cNPAmAp1YnSN",
      "asset" : {
         "amount"  : dice_amount,
         "asset_id": dice_asset_record.id
      }
   };

   var account_rec = pending_state.get_account_record_by_name(input.from_account_name);
   print( account_rec );
   var active_key = account_rec.active_key;
   //if ( !account_rec ) FC_ASSERT(false);


   // TODO the game data must have a index attr with type uint_32.
    var dice_data = {
        index : data_index,
        amount : dice_amount,
        owner : public_key_to_address(active_key),
        odds : input.odds,
        guess : input.guess
    };

   return {
      "to_balances" : [to_balance],
      "datas" : [dice_data]
   };
};

// game execute during extain chain and deterministrix transaction apply
// @return
// 	0: if nothing need to done
//  {"execute_results": [game_result_transactions], "game_datas": [], "diff_balances": [balances_to_update], "diff_supply": [assets]}
PLAY.execute = function(blockchain, block_num, pending_state){
	if (!blockchain)
	{
		return 0;
	}

   print("block number is " + block_num);
   if (block_num <= BTS_BLOCKCHAIN_NUM_DICE){
          return 0;
   }

   var random_seed = blockchain.get_current_random_seed();
   print(random_seed);

   var hash_array = trx_id_to_hash_array(random_seed);

   var block_random_num = Math.abs(hash_array[0]);
   print (block_random_num);

   var range = BTS_BLOCKCHAIN_DICE_RANGE;

   var block_num_of_dice = block_num - BTS_BLOCKCHAIN_NUM_DICE;
   print(block_num_of_dice);

   var block_digest_of_dice = blockchain.get_block_digest(block_num_of_dice);
   print(block_digest_of_dice);

   var shares_destroyed = 0;
   var shares_created = 0;
   var result = {};
   result["execute_results"] = [];
   result["game_datas"] = [];
   result["diff_balances"] = [];
   result["diff_supply"] = [];
   // var result = {"execute_results": [], "game_datas": [], "diff_balances": [], "diff_supply": []};
   for (var pos in block_digest_of_dice.user_transaction_ids)
   {
      var id = block_digest_of_dice.user_transaction_ids[pos];
	  print(id);
	  var hash_array = trx_id_to_hash_array(id);
	  print( hash_array );
	  var data_id = hash_array[0];
	  print(data_id);

      var game_rec = blockchain.get_game_data_record(PLAY.game_id, data_id);
	  print(game_rec);

      if (game_rec)
      {
		 var game_data = game_rec.data;

         var dice_random_num = Math.abs( trx_id_to_hash_array(id)[0] );

         // win condition
            var lucky_number = ( ( ( block_random_num % range ) + ( dice_random_num % range ) ) % range ) * (game_data.odds);
            var guess = game_data.guess;
            var jackpot = 0;
            if ( lucky_number >= (guess - 1) * range && lucky_number < guess * range )
            {
                jackpot = game_data.amount * (game_data.odds) * (100 - BTS_BLOCKCHAIN_DICE_HOUSE_EDGE) / 100;

                // add the jackpot to the accout's balance, give the jackpot from virtul pool to winner
                result["diff_balances"].push(
						{
					      "owner" : game_data.owner,
					      "asset" : {
					         "amount"  : jackpot,
					         "asset_id": PLAY.game_asset.asset_id
					      }
					   }
                );

                shares_created += jackpot;
            }

            // balance destroyed
            shares_destroyed += game_data.amount;

         	// remove the dice_record from pending state after execute the jackpot
			result["game_datas"].push(data_id);	// meaning to remove it if directly return the data_id itself

            var dice_trx = {
                play_owner : game_data.owner,
                jackpot_owner : game_data.owner,
                play_amount : game_data.amount,
                jackpot_received : jackpot,
                odds : game_data.odds,
                lucky_number : parseInt(lucky_number / range) + 1
            };

            result["execute_results"].push( dice_trx ); // game_result_transaction.data = dice_trx;
      }
   }

   // TODO: do not need to add if the diff is 0.
   result["diff_balances"].push({
      // TODO: Game Logic: this does not means the balance are now stored in balance record, just over pass the api
      // the dice record are not in any balance record, they are over-fly-on-sky.
      // equal to use zero_condition(withdraw_with_signature(), dice_asset_record->id);
      // XTS4Attt64KDdan23RJ1rf98cNPAmAp1YnSN = (convert_to_native_address 1Dice12345612345612345612345XLJ3zy)
      "owner" : "XTS4Attt64KDdan23RJ1rf98cNPAmAp1YnSN",
      "asset" : {
         "amount"  : -shares_destroyed,
         "asset_id": PLAY.game_asset.asset_id
      }
   });

   result["diff_supply"].push(
	   {
		   "amount"  : (shares_created - shares_destroyed),	// base_asset_record.current_share_supply += (shares_created - shares_destroyed);
		   "asset_id": PLAY.game_asset.asset_id
	   }
   );

   print(result);

   return result;
};

PLAY.scan_result = function( res_trx, block_num, block_time, trx_index, wallet)
{
	print( res_trx );
   print("trx_index is: " + trx_index);
   print("start scan_result...");
	var game_result = res_trx.data;

   var win = ( game_result.jackpot_received != 0 );
   var play_result = win ? "win" : "lose";

   // TODO: Dice, play owner might be different with jackpot owner
   // TODO: Accessor get_wallet_key_for_address for wallet
   // TODO: Accessor has_private_key for wallet_key
   // TODO: Property account_address for wallet_key
   var jackpot_key = wallet.get_wallet_key_for_address( game_result.jackpot_owner );
	print( jackpot_key );
   if( jackpot_key && (jackpot_key.encrypted_private_key.length > 0) )
   {
       var jackpot_account_key = wallet.get_wallet_key_for_address( jackpot_key.account_address );
	    print( jackpot_account_key );

       // auto bal_id = withdraw_condition(withdraw_with_signature(gtrx.jackpot_owner), 1 ).get_address();
       // auto bal_rec = _blockchain->get_balance_record( bal_id );

       /* What we received */
       var ledger_entries = [];

       ledger_entries.push({
           to_account : jackpot_account_key.public_key,
           amount : {
        	   "amount"  : game_result.jackpot_received,
        	   "asset_id": PLAY.game_asset.asset_id
     	  	},
           memo : play_result + ", jackpot lucky number: " + game_result.lucky_number
       }
       );

	    /* Construct a unique record id */
	    var id_ss = "" + block_num + game_result.jackpot_owner + trx_index;
       print(id_ss);
       print(ledger_entries);

       // TODO: Don't blow away memo, etc.
       var transaction_info = {
           record_id : fc_ripemd160_hash( id_ss ),
           block_num : block_num,
           is_virtual : true,
           is_confirmed : true,
           contract : PLAY.game_asset.symbol, 	// TODO: replace this contract name with game name.
           ledger_entries : ledger_entries,
           // TODO: Dice, do we need fee for claim jackpot? may be later we'll support part to delegates
           fee : {
        	   "amount"  : 0,
        	   "asset_id": 0
     	  	},
           created_time : block_time,
           received_time : block_time 
       };
       
       print( transaction_info );

       wallet.store_transaction( transaction_info );
   }

   return true;

   //} FC_CAPTURE_AND_RETHROW((rtrx))
};

/*
 * This is only for wallet specific usage, not related to protocal. Usually, there will be a purpose for using funds, ant the wallet
 * has a human-read ledger for recording the purpse of these funds changes, but it is not recorded in operation, so the only way is to
 * scan out the purpose by checking the withdraw/deposit operations in the trx
 * @parameters, wallet_transaction_record is the scaned deposit or withdraw operations from other nodes, need to rescan for updating memo
 * @return array of entrys, if empty return []. and return false in C++
 *
 */
PLAY.scan_ledger = function( blockchain, trx_rec, wallet, input )
{
	print("start scan ledger...");
	print(trx_rec);
	print(input);
	var has_deposit = false;

  var account_rec = blockchain.get_account_record_by_name( input.from_account_name );
	print( account_rec );

	if ( account_rec )
	{
	    var owner = public_key_to_address(account_rec.active_key);
      print(owner);
	    var rec_key = wallet.get_wallet_key_for_address(owner);
      print(rec_key);
	    if( rec_key && ( rec_key.encrypted_private_key.length > 0 ) )
	    {
	        // TODO: Refactor this
          print("start updating ledgers");
	        for( var entry in trx_rec.ledger_entries )
	        {
	            // TODO: Read Accessor to_account
				      // if( !entry.to_account.valid() )
	            if( !entry.to_account )
	            {
	                entry.to_account = rec_key.public_key;
	                entry.amount = {
	         	   	     "amount"  : input.amount,
	         	   	     "asset_id": PLAY.game_asset.asset_id
	      	  		  },
	                entry.memo = "play dice";

                  print("has_deposit updating ledgers true...");
					        has_deposit = true;
	            }
	        }
	    }
	}

	return {
		"wallet_trx_record" : trx_rec,
		"has_deposit" : has_deposit
	}
};
