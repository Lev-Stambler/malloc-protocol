"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
// TODO: change over to Rust for functional test
//@ts-ignore
var web3_js_1 = require("@solana/web3.js");
var chai_1 = require("chai");
var progId = new web3_js_1.PublicKey(process.env.PROGRAM_ID || "25wixzoUEfkg5hQTUU9PBZJRJHF2duxZtxMDPkwAsksr");
require("mocha");
var account = new web3_js_1.Account();
var data_account = new web3_js_1.Account();
function initDataAccount(connection, account, data_account) {
    return __awaiter(this, void 0, void 0, function () {
        var createAccountTransaction, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    createAccountTransaction = web3_js_1.SystemProgram.createAccount({
                        fromPubkey: account.publicKey,
                        newAccountPubkey: data_account.publicKey,
                        lamports: 1000000000,
                        space: 1024 * 1024,
                        programId: progId
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, web3_js_1.sendAndConfirmTransaction(connection, new web3_js_1.Transaction().add(createAccountTransaction), [account, data_account], {
                            skipPreflight: true,
                            commitment: "singleGossip"
                        })];
                case 2:
                    _a.sent();
                    console.log("Data account init");
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.error(e_1);
                    throw "Failed to initDataAccount";
                case 4: return [2 /*return*/];
            }
        });
    });
}
function initMallocData(connection, data_account) {
    return __awaiter(this, void 0, void 0, function () {
        var instructionInit, data_account_info, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    instructionInit = new web3_js_1.TransactionInstruction({
                        keys: [
                            {
                                isWritable: true,
                                pubkey: data_account.publicKey,
                                isSigner: true
                            },
                        ],
                        programId: progId,
                        data: Buffer.from(JSON.stringify({ InitMalloc: {} }))
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, web3_js_1.sendAndConfirmTransaction(connection, new web3_js_1.Transaction().add(instructionInit), [account, data_account], {
                            skipPreflight: true,
                            commitment: "singleGossip"
                        })];
                case 2:
                    _a.sent();
                    console.log("Initialized the data in data_account");
                    return [4 /*yield*/, connection.getAccountInfo(data_account.publicKey)];
                case 3:
                    data_account_info = _a.sent();
                    console.log(new TextDecoder("utf-8").decode(new Uint8Array((data_account_info === null || data_account_info === void 0 ? void 0 : data_account_info.data) || [])));
                    return [3 /*break*/, 5];
                case 4:
                    e_2 = _a.sent();
                    console.error(e_2);
                    throw e_2;
                case 5: return [2 /*return*/];
            }
        });
    });
}
function initAccounts() {
    return __awaiter(this, void 0, void 0, function () {
        var connection, lamports;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connection = new web3_js_1.Connection("http://127.0.0.1:8899", "singleGossip");
                    lamports = 10 * 1000000000;
                    console.log("new data account:", data_account.publicKey.toBase58());
                    return [4 /*yield*/, connection.requestAirdrop(account.publicKey, lamports)];
                case 1:
                    _a.sent();
                    console.log("airdrop done");
                    initDataAccount(connection, account, data_account);
                    return [2 /*return*/, connection];
            }
        });
    });
}
describe("Run a standard set of Malloc tests", function () {
    return __awaiter(this, void 0, void 0, function () {
        var conn;
        var _this = this;
        return __generator(this, function (_a) {
            this.timeout(20000);
            before(function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                this.timeout(20000);
                                return [4 /*yield*/, initAccounts()];
                            case 1:
                                conn = _a.sent();
                                return [4 /*yield*/, initMallocData(conn, data_account)];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it("fails if already registered", function () { return __awaiter(_this, void 0, void 0, function () {
                var e_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, initDataAccount(conn, account, data_account)];
                        case 1:
                            _a.sent();
                            chai_1.assert(false);
                            return [3 /*break*/, 3];
                        case 2:
                            e_3 = _a.sent();
                            chai_1.assert(true);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            xit("register a few new WCalls, then create a basket, then execute that basket", function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/];
            }); }); });
            return [2 /*return*/];
        });
    });
});
